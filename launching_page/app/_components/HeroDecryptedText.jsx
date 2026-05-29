"use client";

import DecryptedText from "./DecryptedText";

export default function HeroDecryptedText({ text }) {
  return (
    <DecryptedText
      text={text}
      animateOn="hover"
      sequential
      revealDirection="center"
      speed={25}
      maxIterations={12}
    />
  );
}
