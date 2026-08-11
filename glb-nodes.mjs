import { readFileSync } from 'node:fs'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
globalThis.self = globalThis
if (!globalThis.createImageBitmap) globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close(){} })
if (!globalThis.Image) globalThis.Image = class { set src(_v){} get width(){return 1} get height(){return 1} }
if (!globalThis.ImageData) globalThis.ImageData = class { constructor(w,h){this.width=w;this.height=h;this.data=new Uint8ClampedArray(w*h*4)} }
if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w,h){this.width=w;this.height=h} getContext(){return null} }
const data = readFileSync('sony_alpha_3.glb')
const loader = new GLTFLoader()
loader.parse(data.buffer, '', (gltf) => {
  const scene = gltf.scene; scene.updateWorldMatrix(true)
  const box = new THREE.Box3(); const v = new THREE.Vector3()
  scene.traverse((obj) => {
    if (!obj.isMesh) return
    box.setFromObject(obj); box.getSize(v)
    const matName = obj.material ? (Array.isArray(obj.material) ? obj.material.map(m=>m.name).join(',') : obj.material.name) : 'none'
    console.log(
      `node "${obj.name}"`,
      `| mat "${matName}"`,
      `| tris ${obj.geometry.index ? obj.geometry.index.count/3 : obj.geometry.attributes.position.count/3}`,
      `| min ${box.min.x.toFixed(2)},${box.min.y.toFixed(2)},${box.min.z.toFixed(2)}`,
      `| max ${box.max.x.toFixed(2)},${box.max.y.toFixed(2)},${box.max.z.toFixed(2)}`,
      `| size ${v.x.toFixed(2)}x${v.y.toFixed(2)}x${v.z.toFixed(2)}`,
      `| center ${((box.min.x+box.max.x)/2).toFixed(2)},${((box.min.y+box.max.y)/2).toFixed(2)},${((box.min.z+box.max.z)/2).toFixed(2)}`,
    )
  })
}, (e) => console.error('parse error', e))
