import { AnyInterpreter } from 'xstate';
import { z } from 'zod';
import { SlugSchema, SnowflakeIdSchema } from '../common';
import { GameConfigurationSchema } from '../configuration';
import { EntityBaseSchema } from '../entity/base';
import { EventBaseSchema } from '../events/base';
import {
  DebugEventTypeLiteral,
  GameIdLiteralSchema,
  LogEventTypeLiteral,
  MessageEventTypeLiteral,
  RoomSchemaTypeLiteral,
} from '../literals';
import { StrikersMessageContentBlockSchema } from '@schema/games/strikers';
import {
  ConfirmCommandSchema,
  MultipleChoiceSelectCommandSchema,
} from '@schema/commands';

export const RoomContextSchema = z.object({
  workflows: z.map(z.string(), z.custom<AnyInterpreter>()),
});
// export type RoomContext = z.infer<typeof RoomContextSchema>;

const StartCommandSchema = z.object({
  type: z.literal('START'),
});

const ConnectCommandSchema = z.object({
  type: z.literal('CONNECT'),
  senderId: SnowflakeIdSchema,
});

const DisconnectCommandSchema = z.object({
  type: z.literal('DISCONNECT'),
});

const JoinCommandSchema = z.object({
  type: z.literal('JOIN'),
});

const LeaveCommandSchema = z.object({
  type: z.literal('LEAVE'),
});

export const RoomCommandSchema = z.union([
  ConnectCommandSchema,
  DisconnectCommandSchema,
  JoinCommandSchema,
  StartCommandSchema,
  LeaveCommandSchema,
  ConfirmCommandSchema,
  MultipleChoiceSelectCommandSchema,
]);

export const RoomEntityPropsSchema = z.object({
  schema: RoomSchemaTypeLiteral,
  hostUserId: SnowflakeIdSchema,
  memberUserIds: z.array(SnowflakeIdSchema),
  connectedUserIds: z.array(SnowflakeIdSchema),
  slug: SlugSchema,
  gameId: GameIdLiteralSchema.optional(),
  currentGameInstanceId: SnowflakeIdSchema.optional(),
  currentGameConfiguration: GameConfigurationSchema.optional(),
});

export const RoomStateValueSchema = z.object({
  Scene: z.enum(['Lobby', 'Loading', 'Game']),
  Active: z.enum(['No', 'Yes']), // Yes if there is at least 1 player currently connected
});

// type RoomStateValue = z.infer<typeof RoomStateValueSchema>;
// export type RoomMessageData = z.infer<typeof RoomMessageDataSchema>;

// const RoomMessageDataSchema = z.object({
//   sender: SnowflakeIdSchema,
//   type: MessageEventTypeLiteral,
//   content: z.string(),
// });

export const LogEventSchema = EventBaseSchema(
  LogEventTypeLiteral,
  z.object({
    level: z.enum(['DEBUG', 'INFO', 'ERROR']),
    content: z.string(),
  })
);

export const RoomEntitySchema = EntityBaseSchema(
  RoomEntityPropsSchema,
  RoomCommandSchema,
  RoomStateValueSchema
);

export const DebugEventSchema = EventBaseSchema(
  DebugEventTypeLiteral,
  z.object({
    content: z.string(),
  })
);

export const PlainMessageBlockSchema = z.object({
  type: z.literal('PlainMessage'),
  avatarId: z.string(),
  message: z.string(),
  timestamp: z.string(),
  textSize: z.number().optional(),
  textColor: z.string().optional(),
});

export const UserJoinedBlockSchema = z.object({
  type: z.literal('UserJoined'),
  userId: SnowflakeIdSchema,
  slug: z.string(),
  timestamp: z.string(),
});

export const UserConnectedBlockSchema = z.object({
  type: z.literal('UserConnected'),
  userId: z.string(),
  timestamp: z.string(),
});

export const UserDisconnectedBlockSchema = z.object({
  type: z.literal('UserDisconnected'),
  userId: z.string(),
  timestamp: z.string(),
});

export const StartGameBlockSchema = z.object({
  type: z.literal('StartGame'),
  gameId: GameIdLiteralSchema,
  timestamp: z.string(),
});

export const MultipleChoiceBlockSchema = z.object({
  type: z.literal('MultipleChoice'),
  text: z.string(),
  showConfirm: z.boolean().optional(),
  options: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
    })
  ),
});

// Union of all block schemas
export const MessageContentBlockSchema = z.union([
  PlainMessageBlockSchema,
  UserJoinedBlockSchema,
  UserConnectedBlockSchema,
  UserDisconnectedBlockSchema,
  MultipleChoiceBlockSchema,
  StartGameBlockSchema,
  StrikersMessageContentBlockSchema,
]);

// const MessageContentSchema = z.discriminatedUnion('type', [
//   ConnectMessagePropsSchema,
//   DisconnectMessagePropsSchema,
// ]);

export const RoomMessageEventSchema = EventBaseSchema(
  MessageEventTypeLiteral,
  z.object({
    senderId: SnowflakeIdSchema,
    recipientId: SnowflakeIdSchema.optional(),
    contents: z.array(MessageContentBlockSchema),
  })
);

export const RoomEventSchema = z.discriminatedUnion('type', [
  RoomMessageEventSchema,
  LogEventSchema,
  DebugEventSchema,
]);
