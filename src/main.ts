import "./styles.css";
import { createGame } from "./runtime/createGame";
import { bootScene } from "./scenes/boot";

void createGame({
  parent: "#app",
  width: 1080,
  height: 1920,
  background: "#17202a",
  boot: bootScene,
});
