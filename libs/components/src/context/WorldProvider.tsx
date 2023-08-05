import { trpc } from '@explorers-club/api-client';
import {
  ConnectionEntity,
  Entity,
  EntityChangeEvent,
  EntityCommand,
  InitializedConnectionEntity,
  SessionEntity,
  SnowflakeId,
  SyncedEntityProps,
  UserEntity,
} from '@explorers-club/schema';
import { AnyFunction, assert } from '@explorers-club/utils';
import { Operation, applyPatch } from 'fast-json-patch';
import { createIndex } from 'libs/api/src/world';
import { World } from 'miniplex';
import { Atom, WritableAtom, atom } from 'nanostores';
import {
  FC,
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Selector } from 'reselect';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';

type EntityRegistry = {
  myConnectionEntity: ConnectionEntity;
  mySessionEntity: SessionEntity;
};

type EntityStoreRegistry = {
  [K in keyof EntityRegistry]: Atom<EntityRegistry[K] | null>;
};

// Update the WorldContextType to include the entity type T.
type WorldContextType = {
  world: World<Entity>;
  entitiesById: Map<SnowflakeId, Entity>;
  entityStoreRegistry: EntityStoreRegistry;
  createEntityStore: <TEntity extends Entity>(
    query: (entity: Entity) => boolean
  ) => WritableAtom<TEntity | null>;
  useEntitySelector: <T extends Entity, R>(
    id: SnowflakeId,
    selector: Selector<T, R>
  ) => R;
};

export const WorldContext = createContext({} as WorldContextType);

declare global {
  interface Window {
    $WORLDS: Record<SnowflakeId, World<Entity>>;
  }
}

window.$WORLDS = {};

export const WorldProvider: FC<{
  children: ReactNode;
  world: World<Entity>;
  connectionId: SnowflakeId;
}> = ({ children, world, connectionId }) => {
  const { client } = trpc.useContext();
  type Callback = Parameters<Entity['subscribe']>[0];
  const [entitiesById] = useState(createIndex(world));
  window.$WORLDS[connectionId] = world;
  // const [subscribersById] = useState(new Map<SnowflakeId, Set<() => void>>());
  const [nextFnById] = useState(new Map<SnowflakeId, Callback>());

  const createEntity = useCallback(
    <TEntity extends Entity>(entityProps: SyncedEntityProps<TEntity>) => {
      type TCommand = Parameters<TEntity['send']>[0];
      type TCallback = Parameters<TEntity['subscribe']>[0];
      type TEvent = Parameters<TCallback>[0];

      const id = entityProps.id;
      const subscriptions = new Set<TCallback>();

      const send = async (command: TCommand) => {
        next({
          type: 'SEND_TRIGGER',
          command,
        } as TEvent);
        await client.entity.send.mutate({
          entityId: id,
          command: command as EntityCommand,
        });
        next({
          type: 'SEND_COMPLETE',
          command,
        } as TEvent);
      };

      const subscribe = (callback: TCallback) => {
        subscriptions.add(callback);

        return () => {
          subscriptions.delete(callback);
        };
      };

      const next = (event: TEvent) => {
        for (const callback of subscriptions) {
          const fn = callback as AnyFunction; // hack fix for ts complaining about typ ecomplex
          fn(event);
        }
      };
      nextFnById.set(id, next);

      const entity: TEntity = {
        send,
        subscribe,
        ...entityProps,
      } as unknown as TEntity;
      // todo add send and subscribe methods here
      return entity;
    },
    [client, nextFnById]
  );

  useEffect(() => {
    const sub = client.entity.list.subscribe(undefined, {
      onError(err) {
        console.error(err);
      },
      onData(event) {
        if (event.type === 'ADDED') {
          for (const entityProps of event.entities) {
            const entity = createEntity(entityProps);

            entitiesById.set(entityProps.id, entity);
            world.add(entity);
          }
        } else if (event.type === 'REMOVED') {
          for (const entityProps of event.entities) {
            const entity = entitiesById.get(entityProps.id);
            if (!entity) {
              console.error('missing entity when trying to remove');
              return;
            }

            world.remove(entity);
          }
        } else if (event.type === 'CHANGED') {
          for (const change of event.changedEntities) {
            const entity = entitiesById.get(change.id);
            if (!entity) {
              console.error('missing entity when trying to apply patches');
              return;
            }
            console.log({ patches: change.patches });

            /**
             * Applies any to-level "add" or "remove" operations on the entity
             * to the world/ecs so indexes can updates.
             *
             * All other operations are batched together and applied to the
             * entity directly
             */
            const changeOps: Operation[] = [];
            for (const operation of change.patches) {
              if (operation.path.match(/^\/\w+$/) && operation.op === 'add') {
                const pathParts = operation.path.split('/');
                const component = pathParts[1] as keyof typeof entity;
                world.addComponent(entity, component, operation.value);
              } else if (
                operation.path.match(/^\/\w+$/) &&
                operation.op === 'remove'
              ) {
                const pathParts = operation.path.split('/');
                const component = pathParts[1] as keyof typeof entity;
                world.removeComponent(entity, component);
              } else {
                changeOps.push(operation);
              }
            }
            if (changeOps.length) {
              applyPatch(entity, changeOps);
            }

            // Notify observers about changes
            const next = nextFnById.get(entity.id);
            assert(
              next,
              'expected next function to exist for entity ' + entity.id
            );

            next({
              type: 'CHANGE',
              patches: change.patches,
            } as any as EntityChangeEvent);
          }
        }
      },
    });

    return sub.unsubscribe;
  }, [client, createEntity, nextFnById, world]);

  // is this being used?
  const useEntitySelector = useCallback(
    <T extends Entity, R>(id: SnowflakeId, selector: Selector<T, R>) => {
      const getSnapshot = () => {
        const entity = entitiesById.get(id) as T | undefined;
        if (!entity) {
          throw new Error('entity missing: ' + entity);
        }

        return entity;
      };

      const subscribe = (onStoreChange: () => void) => {
        const entity = entitiesById.get(id);
        if (!entity) {
          throw new Error('entity missing: ' + entity);
        }

        const unsub = entity.subscribe(onStoreChange);

        return () => {
          unsub();
        };
      };

      return useSyncExternalStoreWithSelector(
        subscribe,
        getSnapshot,
        getSnapshot,
        selector
      );
    },
    []
  );

  /**
   * Entity stores hold a reference to an entity
   * This function creates an entity store given a query function.
   *
   * It allows components to specify what they are looking for and then "wait"
   * for the entity to show up in the store. They can then use
   * useEntityStoreSelector to select typed data from the store, returning
   * null for the selected data if the entity does not exist.
   */
  const createEntityStore = useCallback(
    <TEntity extends Entity>(query: (entity: Entity) => boolean) => {
      const store = atom<TEntity | null>(null);
      // take the first entity to match it
      for (const entity of world.entities) {
        if (query(entity)) {
          store.set(entity as TEntity);
          break;
        }
      }

      // todo fix mem leak
      world.onEntityAdded.add((addedEntity) => {
        if (query(addedEntity as TEntity)) {
          store.set(addedEntity as TEntity);
        }

        addedEntity.subscribe(() => {
          // console.log(
          //   'entity event sub',
          //   JSON.parse(JSON.stringify(addedEntity))
          // );
          // console.log('store', store.get());
          // console.log('query', query, query(addedEntity));
          if (!store.get() && query(addedEntity as TEntity)) {
            store.set(addedEntity as TEntity);
          }

          if (addedEntity === store.get() && !query(addedEntity as TEntity)) {
            store.set(null);
          }
        });
      });

      world.onEntityRemoved.add((entity) => {
        if (store.get() === entity) {
          store.set(null);
        }
      });

      return store;
    },
    []
  );
  const [entityStoreRegistry] = useState({
    myConnectionEntity: createEntityStore<ConnectionEntity>(
      (entity) => entity.schema === 'connection'
    ),
    mySessionEntity: createEntityStore<SessionEntity>(
      (entity) => entity.schema === 'session'
    ),
  } satisfies EntityStoreRegistry);

  return (
    <WorldContext.Provider
      value={{
        world,
        entitiesById,
        createEntityStore,
        entityStoreRegistry,
        useEntitySelector,
        // useSend,
      }}
    >
      {children}
    </WorldContext.Provider>
  );
};
