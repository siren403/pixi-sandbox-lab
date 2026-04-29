import "./styles.css";
import { createGame } from "./runtime/createGame";
import { bootScene } from "./scenes/boot";

void createGame({
  parent: "#app",
  width: 960,
  height: 540,
  background: "#17202a",
  boot: bootScene,
});
