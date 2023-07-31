// See explanation at https://trpc.io/docs/context#inner-and-outer-context
// Inner context is context which doesn't depend on the request (e.g. DB)
import { Database } from '@explorers-club/database';
import { ConnectionEntity, SnowflakeId } from '@explorers-club/schema';
import { assert } from '@explorers-club/utils';
import { ConnectionAccessTokenPropsSchema } from '@schema/common';
import { createClient } from '@supabase/supabase-js';
import { type inferAsyncReturnType } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { IncomingMessage } from 'http';
import * as JWT from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createEntity } from './ecs';
import { entitiesById, world } from './server/state';
import { waitForEntity } from './world';

// const supabaseUrl = process.env['SUPABASE_URL'];
// const supabaseJwtSecret = process.env['SUPABASE_JWT_SECRET'];
// const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'];
// const supabaseServiceKey = process.env['SUPABASE_SERVICE_KEY'];

const instanceId = uuidv4();

// todo: switch to using zod for parsing
// if (
//   !supabaseUrl ||
//   !supabaseJwtSecret ||
//   !supabaseAnonKey ||
//   !supabaseServiceKey
// ) {
//   throw new Error('missing supabase configuration');
// }

// const supabaseAdminClient = createClient<Database>(
//   supabaseUrl,
//   supabaseServiceKey
// );

// supabaseAdminClient
//   .from('server_instances')
//   .insert({ id: instanceId })
//   .then(() => {
//     console.log('Service Instance Registered', instanceId);
//   });

type CreateContextOptions = {
  request:
    | {
        type: 'socket';
        socket: WebSocket;
      }
    | { type: 'http'; request: trpcExpress.CreateExpressContextOptions['req'] };
  response:
    | {
        type: 'socket';
        socket: WebSocket;
      }
    | {
        type: 'http';
        response: trpcExpress.CreateExpressContextOptions['res'];
      };
  connectionEntity: ConnectionEntity;
  instanceId: SnowflakeId;
};

/** Use this helper for:
 *  - testing, where we dont have to Mock Next.js' req/res
 *  - trpc's `createSSGHelpers` where we don't have req/res
 * @see https://beta.create.t3.gg/en/usage/trpc#-servertrpccontextts
 */
export const createContextInner = async (ctx: CreateContextOptions) => {
  return ctx;
};

export const createContextHTTP = async (
  opts: trpcExpress.CreateExpressContextOptions
) => {
  const accessToken = opts.req.headers.authorization?.split('Bearer ')[1];
  assert(
    accessToken,
    'expected authorizaiton header to be of form Bearer ACCESS_TOKEN'
  );
  const { sub, sessionId, deviceId, initialRouteProps, url } =
    parseAccessToken(accessToken);

  const connectionEntity = createEntity<ConnectionEntity>({
    id: sub,
    schema: 'connection',
    instanceId,
    currentGeolocation: undefined,
    // allChannelIds: [],
    currentUrl: url,
    sessionId,
    deviceId,
    initialRouteProps,
  });
  world.add(connectionEntity);

  return {
    connectionEntity,
    instanceId,
    request: {
      type: 'http',
      request: opts.req,
    },
    response: {
      type: 'http',
      response: opts.res,
    },
  } satisfies CreateContextOptions;
};

/**
 * This is the actual context you'll use in your router
 * @link https://trpc.io/docs/context
 **/
export const createContextWebsocket = async (opts: {
  req: IncomingMessage;
  res: WebSocket;
}) => {
  assert(opts.req.url, 'expected url in url');
  assert(opts.req.headers.host, 'expected host in request');
  const url = new URL(opts.req.url, `ws://${opts.req.headers.host}`);
  const accessToken = url.searchParams.get('accessToken');
  assert(accessToken, "couldn't parse accessToken from connection url");

  const { sub } = parseAccessToken(accessToken);
  const connectionEntity = await waitForEntity(world, entitiesById, sub);
  assert(
    connectionEntity.schema === 'connection',
    'got type of entity for connection: ' + connectionEntity.schema
  );

  // todo: its possible that connectionEntity doesn't exist yet,
  // we can create it from the accessToken sync if we have to

  const socket = opts.res;

  const contextInner = await createContextInner({
    connectionEntity,
    request: {
      type: 'socket',
      socket,
    },
    instanceId,
    response: {
      type: 'socket',
      socket,
    },
  });

  return {
    ...contextInner,
    // pass on the same props for other middleware, might not need to do
    // req: opts.req,
    // socket: opts.res,
  } satisfies CreateContextOptions;
};

export type TRPCContext = inferAsyncReturnType<typeof createContextInner>;

const parseAccessToken = (accessToken: string) => {
  const verifiedToken = JWT.verify(accessToken, 'my_private_key', {
    jwtid: 'ACCESS_TOKEN',
  });

  return ConnectionAccessTokenPropsSchema.parse(verifiedToken);
};
