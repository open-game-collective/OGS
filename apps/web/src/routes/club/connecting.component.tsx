import { Loader } from '@react-three/drei';
import { Text } from '../../components/atoms/Text';
import { Container } from './club.styles';

export const Connecting = () => {
  return (
    <Container>
      <Text>connecting</Text>
      <Loader />
    </Container>
  );
};
