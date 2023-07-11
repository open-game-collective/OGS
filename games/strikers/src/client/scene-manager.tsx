import type {
  SnowflakeId,
  StrikersGameEntity,
  StrikersPlayerEntity,
} from '@explorers-club/schema';
import { useFrame } from '@react-three/fiber';
import { assertEntitySchema } from '@explorers-club/utils';
import { useCreateEntityStore } from '@hooks/useCreateEntityStore';
import { useStore } from '@nanostores/react';
import { MapControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Grid, defineHex, rectangle } from 'honeycomb-grid';
import { FC, createContext, useEffect, useRef, useState } from 'react';
import { SplashScene } from './scenes/splash-scene';

const StrikersContext = createContext({
  gameEntity: {} as StrikersGameEntity,
  playerEntity: {} as StrikersPlayerEntity | undefined,
});

export const StrikersSceneManager: FC<{
  gameInstanceId: SnowflakeId;
}> = ({ gameInstanceId }) => {
  const gameEntityStore = useCreateEntityStore<StrikersGameEntity>(
    (entity) => {
      return entity.id === gameInstanceId;
    },
    [gameInstanceId]
  );

  const gameEntity = useStore(gameEntityStore);
  if (!gameEntity) {
    return <></>;
  }

  assertEntitySchema(gameEntity, 'strikers_game');

  return (
    <StrikersContext.Provider value={{ gameEntity, playerEntity: undefined }}>
      <SplashScene />
    </StrikersContext.Provider>
  );
};

const Tile = defineHex({ dimensions: 30 });

export const StrikersGameScene = () => {
  // const [grid] = useState(new Grid(Tile, rectangle({ width: 25, height: 15 })));
  // const cells = Array.from(grid).map((cell) => {
  //   return cell;
  // });

  return (
    <>
      <MapControls screenSpacePanning={true} />
      <SplashScene />
      {/* {cells.map((cell) => {
        return (
          <mesh
            key={cell.toString()}
            position={[cell.center.x, 0, cell.center.y]}
          >
            <boxBufferGeometry attach="geometry" args={[2, 2, 2]} />
            <meshStandardMaterial attach="material" color={0xcc0000} />
          </mesh>
        );
      })} */}
    </>
  );
};