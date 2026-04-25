import {useState} from "react";
import reactLogo from "@/assets/react.svg";
import {invoke} from "@tauri-apps/api/core";
import {Button} from "@/components/ui/button";


function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", {name}));
  }

  return (
      <main className="m-0 flex min-h-screen flex-col justify-center pt-[10vh] text-center">
        <h1 className="text-center text-4xl font-semibold">Welcome to Tauri + React</h1>

        <div className="flex justify-center">
          <a
              href="https://vite.dev"
              target="_blank"
              className="font-medium text-[#646cff] no-underline transition-colors hover:text-[#535bf2]"
          >
            <img
                src="/neptune.svg"
                className="h-24 p-6 transition-[filter] duration-700 ease-in-out hover:drop-shadow-[0_0_2em_#747bff]"
                alt="Vite logo"
            />
          </a>
          <a
              href="https://tauri.app"
              target="_blank"
              className="font-medium text-[#646cff] no-underline transition-colors hover:text-[#535bf2]"
          >
            <img
                src="/neptune.svg"
                className="h-24 p-6 transition-[filter] duration-700 ease-in-out hover:drop-shadow-[0_0_2em_#24c8db]"
                alt="Tauri logo"
            />
          </a>
          <a
              href="https://react.dev"
              target="_blank"
              className="font-medium text-[#646cff] no-underline transition-colors hover:text-[#535bf2]"
          >
            <img
                src={reactLogo}
                className="h-24 p-6 transition-[filter] duration-700 ease-in-out hover:drop-shadow-[0_0_2em_#61dafb]"
                alt="React logo"
            />
          </a>
        </div>
        <p>Click on the Tauri, Vite, and React logos to learn more.</p>

        <form
            className="flex justify-center"
            onSubmit={(e) => {
              e.preventDefault();
              void greet();
            }}
        >
          <input
              id="greet-input"
              className="mr-1.25 rounded-lg border border-transparent bg-white px-5 py-2.5 font-medium text-[#0f0f0f] shadow-[0_2px_2px_rgba(0,0,0,0.2)] outline-none transition-colors focus:border-[#396cd8]"
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Enter a name..."
          />
          <Button
              type="submit"
          >
            Greet
          </Button>
        </form>
        <p>{greetMsg}</p>
      </main>
  );
}

export default App;
