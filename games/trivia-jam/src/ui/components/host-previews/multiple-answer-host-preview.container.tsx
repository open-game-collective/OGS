import { CONTINUE } from '@explorers-club/commands';
import { IMultipleAnswerFields } from '@explorers-club/contentful-types';
import { useCallback } from 'react';
import {
  useCurrentQuestionFields,
  useSend,
  useStoreSelector
} from '../../../state/trivia-jam.hooks';
import { selectResponsesByPlayerName } from '../../../state/trivia-jam.selectors';
import { MultipleAnswerHostPreviewComponent } from './multiple-answer-host-preview.component';

export const MultipleAnswerHostPreview = () => {
  const fields =
    useCurrentQuestionFields<IMultipleAnswerFields>('multipleAnswer');

  const send = useSend();
  const responsesByPlayerName = useStoreSelector(
    selectResponsesByPlayerName<string[]>
  );

  const handleContinue = useCallback(() => {
    send({ type: CONTINUE });
  }, [send]);

  if (!fields) {
    return null;
  }

  return (
    <MultipleAnswerHostPreviewComponent
      onContinue={handleContinue}
      responsesByPlayerName={responsesByPlayerName}
      fields={fields}
    />
  );
};
