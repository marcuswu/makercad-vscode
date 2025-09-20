import { ViewModel } from "./viewmodel"
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import * as THREE from "three"
import { Config } from "../config"

interface makercadExtConfig {
    modelViewOffset: number
}
interface vscodeWindow {
    showInformationMessage(message: string): void
}
interface vscodeWorkspace {
    getConfiguration(config: string): makercadExtConfig
}
interface vscode {
    postMessage(message: any): void
    window: vscodeWindow
    workspace: vscodeWorkspace
}

declare const vscode: vscode
const fileSelector = document.getElementById("fileSelector")

function sendViewState() {
    const file = fileSelector?.nodeValue || ''
    vscode.postMessage({
        selectedFile: file
    })
}

function initRenderer(viewerElement: HTMLElement): THREE.WebGLRenderer {
    const {width, height} = viewerElement.getBoundingClientRect()
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)

    document.body.appendChild(renderer.domElement)

    return renderer
}

function initControls(renderer: THREE.WebGLRenderer, camera: THREE.Camera): TrackballControls {
    const controls = new TrackballControls(camera, renderer.domElement)
    controls.rotateSpeed = 5.0
    controls.zoomSpeed = 1.0
    controls.panSpeed = 0.5

    return controls
}

function initLights(scene: THREE.Scene) {
    const dirLight1 = new THREE.DirectionalLight( 0xffffff, 3)
    dirLight1.position.set(50, 50, 50)
    scene.add(dirLight1)
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 3)
    dirLight2.position.set(-50, 50, -50)
    scene.add(dirLight2)

    const ambient = new THREE.AmbientLight(0xffffff)
    scene.add(ambient)
}

function updateControls(controls: TrackballControls, camera: THREE.Camera, mesh: THREE.Mesh, viewOffset: number) {
    const boundingBox = new THREE.Box3()
    boundingBox.setFromObject(mesh)

    const meshCenter = boundingBox.getCenter(new THREE.Vector3(0, 0, 0))
    camera.lookAt(meshCenter)
    controls.target = meshCenter
    camera.position.setZ(boundingBox.getSize(new THREE.Vector3(0, 0, 0)).z + viewOffset)

    controls.update()
}

interface State {
    cameraPosition?: {
        x: number,
        y: number,
        z: number
    }
}
interface StateManager {
    getState(): State,
    setState(s: State): void
}

const WEBVIEW_STATE: State = {}

function setStateManager(): StateManager {
    return {
        getState: (): State => {
            return WEBVIEW_STATE
        },
        setState: (s: State) => {
        }
    }
}

function onWindowResize( camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: TrackballControls) {
    const viewer = document.getElementById("viewer")
    if (!viewer) {
        return
    }
    const { width, height } = viewer.getBoundingClientRect()

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height)

    controls.handleResize()
}

function renderFrame(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, controls: TrackballControls) {
    requestAnimationFrame(() => {
        renderFrame(scene, camera, renderer, controls)
    })
    controls.update()
    renderer.render(scene, camera)
}

function main() {
    console.log("in main")
    const viewer = document.getElementById("viewer")
    if (!viewer) {
        return
    }
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = initRenderer(viewer)
    initLights(scene)
    const controls = initControls(renderer, camera)
    let mesh: THREE.Mesh | null = null
    let config: Config | null = null

    viewer.appendChild(renderer.domElement)

    fileSelector?.addEventListener("change", () => {
        sendViewState()
    })

    window.addEventListener('message', (event: MessageEvent<ViewModel>) => {
        console.log("event listener", event.data)
        console.log("file length", event.data.fileContents.byteLength)
        if (event.data.config) {
            config = event.data.config
        }
        if (event.data.fileContents.byteLength > 0) {
            console.log("loading file", event.data.files[event.data.selectedFile])
            if (mesh) {
                scene.remove(mesh);
            }
            const loader = new STLLoader();
            const geometry = loader.parse(event.data.fileContents);
            const material = new THREE.MeshPhongMaterial({ color: 0x3eacf0, flatShading: true })
            mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            updateControls(controls, camera, mesh, config?.modelViewDist || 50);
        }
        if (fileSelector) {
            fileSelector.innerHTML = ''
        }
        if (event.data.files) {
            event.data.files.forEach((file, idx) => {
                const fileOption = document.createElement("option")
                fileOption.textContent = file
                fileOption.setAttribute("value", file)
                fileOption.selected = idx === event.data.selectedFile
                fileSelector?.appendChild(fileOption)
            });
        }
    })

    window.addEventListener("resize", () => onWindowResize(camera, renderer, controls), false)

    renderFrame(scene, camera, renderer, controls)
}

console.log("starting main")
main()