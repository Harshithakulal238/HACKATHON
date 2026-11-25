import { useEffect, useRef, useState } from "react";

export function useAudioPlayer(src) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const updateProgress = () => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  };

  return { audioRef, playing, progress, toggle, updateProgress };
}