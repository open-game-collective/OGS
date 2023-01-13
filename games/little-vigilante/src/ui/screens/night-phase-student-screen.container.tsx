import { useMyUserId } from 'games/trivia-jam/src/state/trivia-jam.hooks';
import React from 'react';
import { useLittleVigilanteSelector } from '../../state/little-vigilante.hooks';
import { selectPlayersWithNameAndRole } from '../../state/little-vigilante.selectors';
import { NightPhaseStudentScreenComponent } from './night-phase-student-screen.component';

export const NightPhaseStudentScreen = () => {
  const myUserId = useMyUserId();
  const otherStudents = useLittleVigilanteSelector(selectPlayersWithNameAndRole)
    .filter(({ userId, role }) => role === 'student' && userId !== myUserId)
    .map(({ name }) => name);
  return <NightPhaseStudentScreenComponent otherStudents={otherStudents} />;
};
