/* 🎨 Style global */
body {
  font-family: "Segoe UI", Tahoma, sans-serif;
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #f0f9ff, #e0f7fa);
  color: #333;
  text-align: center;
}

/* 💡 Écran d’accueil */
#welcome-screen {
  margin-top: 20vh;
  background: white;
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  width: 90%;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

#welcome-screen h1 {
  font-size: 2em;
  margin-bottom: 10px;
}

#welcome-screen input {
  padding: 12px;
  border: 2px solid #90caf9;
  border-radius: 12px;
  width: 80%;
  max-width: 300px;
  font-size: 1em;
  margin-top: 10px;
}

#welcome-screen button {
  display: block;
  margin: 20px auto 0 auto;
  padding: 12px 24px;
  font-size: 1em;
  background: #42a5f5;
  color: white;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: 0.3s;
}

#welcome-screen button:hover {
  background: #1e88e5;
}

/* 🌳 Interface arbre */
#tree-container {
  padding: 15px;
}

#tree-container h2 {
  margin: 10px 0;
  color: #1565c0;
}

.controls {
  margin-bottom: 15px;
}

.controls button {
  margin: 5px;
  padding: 8px 14px;
  font-size: 0.9em;
  background: #ffffff;
  color: #1565c0;
  border: 2px solid #1565c0;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.3s;
}

.controls button:hover {
  background: #e3f2fd;
}

/* 🖼 Zone SVG de l’arbre */
#familyTree {
  width: 100%;
  height: 75vh;
  background: white;
  border-radius: 20px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  overflow: hidden;
}

/* 👤 Style des bulles/personnes */
.node circle {
  fill: #42a5f5;
  stroke: #1565c0;
  stroke-width: 2px;
}

.node text {
  font-size: 13px;
  font-weight: bold;
  fill: white;
  pointer-events: none;
}

/* 🔗 Liens entre membres */
.link {
  fill: none;
  stroke: #90a4ae;
  stroke-width: 2px;
  stroke-linecap: round;
    }
