import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get("destination");
  const origin = searchParams.get("origin") || "Front desk";

  if (!destination) {
    return NextResponse.json({ error: "destination query param required" }, { status: 400 });
  }

  const backendDir = process.env.BACKEND_DIR || path.join(process.cwd(), "../backend");

  // Inline Python script — imports Wayfinder and dumps the result as JSON
  const script = `
import sys, json
sys.path.insert(0, ${JSON.stringify(backendDir)})
from wayfinding import Wayfinder
wf = Wayfinder(${JSON.stringify(path.join(backendDir, "data"))})
result = wf.find_path(${JSON.stringify(destination)}, ${JSON.stringify(origin)})
# nodes & buildings can be large — strip waypoints to trim payload
if result and "nodes" in result:
    result["nodes"] = [n for n in result["nodes"] if n.get("type") != "waypoint"]
print(json.dumps(result))
`.trim();

  // Try the venv Python interpreters in order of preference
  const pythonCandidates = [
    path.join(backendDir, "venv_310", "Scripts", "python.exe"),
    path.join(backendDir, "venv_312", "Scripts", "python.exe"),
    path.join(backendDir, "venv",     "Scripts", "python.exe"),
    "python3",
    "python",
  ];

  for (const python of pythonCandidates) {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        execFile(python, ["-c", script], { timeout: 15_000 }, (err, stdout, stderr) => {
          if (err) return reject(new Error(stderr || err.message));
          resolve(stdout.trim());
        });
      });
      const data = JSON.parse(result);
      return NextResponse.json(data);
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { error: "Python not found or wayfinding failed. Ensure backend venv is set up." },
    { status: 500 },
  );
}
