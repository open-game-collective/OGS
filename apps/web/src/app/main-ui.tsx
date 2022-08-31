import { useCallback, useRef, useState } from 'react';
import { BottomSheet, BottomSheetRef } from 'react-spring-bottom-sheet';
import 'react-spring-bottom-sheet/dist/style.css';
import { Routes, Route } from 'react-router-dom';
import { Home } from '../routes/home';
import { Party } from '../routes/party';

export function MainUI() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [open, setOpen] = useState(true);

  const handleDismiss = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <BottomSheet
      open={open}
      onDismiss={handleDismiss}
      blocking={false}
      snapPoints={({ maxHeight }) => [maxHeight / 4, maxHeight * 0.6]}
      ref={sheetRef}
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="party/:code" element={<Party />} />
      </Routes>
    </BottomSheet>
  );
}

export default MainUI;
