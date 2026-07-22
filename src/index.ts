import * as BABYLON from "@babylonjs/core";
import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { getSceneModuleWithName } from "./createScene";

//import "@babylonjs/inspector";

const getModuleToLoad = (): string | undefined => location.search.split('scene=')[1];

export const babylonInit = async (): Promise<void>  => {
    // get the module to load
    const moduleName = getModuleToLoad();
    const createSceneModule = await getSceneModuleWithName(moduleName);

    (window as any).BABYLON = BABYLON; // required for ES6 to work for the time being

    // Execute the pretasks, if defined
    await Promise.all(createSceneModule.preTasks || []);
    // Get the canvas element
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement; 
    // Generate the BABYLON 3D engine
    //const engine = new Engine(canvas, true); 

    // Compatibility shim: GPUAdapter.requestAdapterInfo() is a deprecated async method
    // that newer browsers (e.g. recent Android Chrome builds) have already removed in
    // favor of a synchronous `.info` property, but this version of @babylonjs/core still
    // calls the old method unconditionally during WebGPUEngine.initAsync(), crashing WebGPU
    // init outright on browsers that no longer have it. Wrap requestAdapter() so any
    // adapter missing the old method gets it back, backed by the new property.
    const gpu = (navigator as any).gpu;
    if (gpu && typeof gpu.requestAdapter === "function") {
        const originalRequestAdapter = gpu.requestAdapter.bind(gpu);
        gpu.requestAdapter = async (...args: unknown[]) => {
            const adapter = await originalRequestAdapter(...args);
            if (adapter && typeof adapter.requestAdapterInfo !== "function" && "info" in adapter) {
                adapter.requestAdapterInfo = () => Promise.resolve(adapter.info);
            }
            return adapter;
        };
    }

    let engine: Engine;
    const webgpuSupported = await WebGPUEngine.IsSupportedAsync;

    if (webgpuSupported) {
        engine = new WebGPUEngine(canvas, {
            deviceDescriptor: {
                requiredFeatures: [
                    "depth-clip-control",
                    "depth32float-stencil8",
                    "texture-compression-bc",
                    "texture-compression-etc2",
                    "texture-compression-astc",
                    "timestamp-query",
                    "indirect-first-instance",
                ],
            },
        });

        // WebGPUEngine.initAsync() swallows any error raised while setting up the
        // WebGPU device/context internally (it only logs via BABYLON.Logger.Error and
        // resolves anyway), which can leave the engine half-initialized and crash much
        // later with a confusing error deep in Scene/UniformBuffer construction.
        // Capture what it logs so a silent failure here surfaces the real cause instead.
        // Note: Logger._Levels binds its "Error" entry directly to the native
        // console.error function reference at module-load time, so reassigning
        // window.console.error here would never actually intercept it - hook the
        // OnNewCacheEntry callback Babylon provides for exactly this instead.
        const capturedErrors: string[] = [];
        const originalOnNewCacheEntry = BABYLON.Logger.OnNewCacheEntry;
        BABYLON.Logger.OnNewCacheEntry = (entry: string) => {
            capturedErrors.push(entry.replace(/<[^>]+>/g, ""));
            originalOnNewCacheEntry?.(entry);
        };

        try {
            await (engine as WebGPUEngine).initAsync();
        } finally {
            BABYLON.Logger.OnNewCacheEntry = originalOnNewCacheEntry;
        }

        const caps = engine.getCaps();
        if (!caps || !caps.supportComputeShaders) {
            throw new Error(
                "WebGPU device/context initialization failed silently.\n" +
                (capturedErrors.length > 0 ? "Captured log output:\n" + capturedErrors.join("\n") : "No errors were logged.")
            );
        }
    } else {
        engine = new Engine(canvas, true);
    }

    // Create the scene
    const scene = await createSceneModule.createScene(engine, canvas);

    (window as any).engine = engine;
    (window as any).scene = scene;

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
        scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });
}

babylonInit().then(() => {
    // scene started rendering, everything is initialized
}).catch((err) => {
    console.error(err);

    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);

    const errorDiv = document.createElement("div");
    errorDiv.style.position = "fixed";
    errorDiv.style.inset = "0";
    errorDiv.style.background = "#000";
    errorDiv.style.color = "#f66";
    errorDiv.style.fontFamily = "monospace";
    errorDiv.style.fontSize = "14px";
    errorDiv.style.padding = "16px";
    errorDiv.style.boxSizing = "border-box";
    errorDiv.style.overflow = "auto";
    errorDiv.style.zIndex = "99999";
    errorDiv.style.whiteSpace = "pre-wrap";
    errorDiv.textContent = "Failed to start the demo:\n\n" + message;

    document.body.appendChild(errorDiv);
});
