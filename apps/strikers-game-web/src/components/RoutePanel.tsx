import { Box } from '@atoms/Box';
import { ButtonLink } from '@atoms/Button';
import { Flex } from '@atoms/Flex';
import { Heading } from '@atoms/Heading';
import { ApplicationContext } from '@context/ApplicationContext';
import { InitializedConnectionEntityContext } from '@context/Entity';
import { WorldContext } from '@context/WorldProvider';
import type { RoomEntity } from '@explorers-club/schema';
import { useCreateEntityStore } from '@hooks/useCreateEntityStore';
import { useEntityStoreSelector } from '@hooks/useEntityStoreSelector';
import { useStore } from '@nanostores/react';
import { NewRoomFlow } from '@organisms/new-room-flow';
import { Channel } from '@organisms/channel';
import { ChannelProvider } from '@organisms/channel/channel.context';
import { MouseEventHandler, useCallback, useContext } from 'react';

export const RoutePanel = () => {
  const { routeStore } = useContext(ApplicationContext);
  const currentRoute = useStore(routeStore);

  return (
    <Box css={{ border: '4px solid grey' }}>
      {currentRoute.name === 'Home' && <HomePanel />}
      {currentRoute.name === 'New' && <NewRoomPanel />}
      {currentRoute.name === 'Login' && <LoginPanel />}
      {currentRoute.name === 'Room' && <RoomPanel />}
    </Box>
  );
};

const HomePanel = () => {
  const { entityStoreRegistry } = useContext(WorldContext);

  const handleCreateRoom: MouseEventHandler<HTMLAnchorElement> = useCallback(
    (event) => {
      const entity = entityStoreRegistry.myConnectionEntity.get();
      if (entity) {
        event.preventDefault();
        entity.send({
          type: 'NAVIGATE',
          route: { name: 'New' },
        });
      }
    },
    []
  );

  return (
    <Flex direction="column" gap="2">
      <Heading>Home</Heading>
      <ButtonLink href="/new" onClick={handleCreateRoom}>
        Create Room
      </ButtonLink>
    </Flex>
  );
};

const LoginPanel = () => {
  return <div>Login</div>;
};

const NewRoomPanel = () => {
  const { entityStoreRegistry } = useContext(WorldContext);
  const entity = useStore(entityStoreRegistry.myConnectionEntity);
  return entity ? (
    <InitializedConnectionEntityContext.Provider value={entity}>
      <NewRoomFlow />
    </InitializedConnectionEntityContext.Provider>
  ) : null;
};

// TODO make this common to be able to use in HTML and canvas
const RoomPanel = () => {
  const { entityStoreRegistry } = useContext(WorldContext);
  const connectionEntity = useStore(entityStoreRegistry.myConnectionEntity);
  const currentChannelId = useEntityStoreSelector(
    entityStoreRegistry.myConnectionEntity,
    (entity) => entity.currentChannelId
  );

  const roomEntityStore = useCreateEntityStore<RoomEntity>(
    (entity) => {
      return (currentChannelId && entity.id === currentChannelId) as boolean;
    },
    [currentChannelId]
  );

  const roomEntity = useStore(roomEntityStore);

  if (!roomEntity || !connectionEntity) {
    return <div>loading entities</div>;
  }

  return (
    <ChannelProvider>
      <Channel />
    </ChannelProvider>
  );
};
