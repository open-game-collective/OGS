import { Avatar } from '@atoms/Avatar';
import { Caption } from '@atoms/Caption';
import { Flex } from '@atoms/Flex';
import { Text } from '@atoms/Text';
import { colorBySlotNumber } from '@explorers-club/styles';
import { CheckboxCard } from '@molecules/CheckboxCard';
import { FC, useCallback, useRef } from 'react';

interface Props {
  onSelectPlayers: (players: readonly [string, string]) => void;
  players: { userId: string; name: string; slotNumber: number }[];
}

export const NightPhaseConspiratorComponent: FC<Props> = ({
  onSelectPlayers,
  players,
}) => {
  const selected = useRef<Record<string, boolean>>({});

  const handleCheckChange = useCallback(
    (userId: string) => {
      return (value: boolean) => {
        if (value) {
          selected.current[userId] = true;
        } else {
          delete selected.current[userId];
        }

        const userIds = Object.keys(selected.current);

        if (userIds.length === 2) {
          onSelectPlayers([userIds[0], userIds[1]] as const);
        }
      };
    },
    [selected, onSelectPlayers]
  );

  return (
    <Flex direction="column" gap="3">
      <Caption>Conspirator</Caption>
      <Text>Choose two players to swap roles</Text>
      <Flex direction="column" gap="3">
        {players.map(({ userId, name, slotNumber }) => (
          <CheckboxCard onCheckedChange={handleCheckChange(userId)}>
            <Flex gap="2" align="center">
              <Avatar size="3" variant={colorBySlotNumber[slotNumber]} />
              <Text>{name}</Text>
            </Flex>
          </CheckboxCard>
        ))}
      </Flex>
    </Flex>
  );
};