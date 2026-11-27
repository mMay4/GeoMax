// Inicia API y Vite sin usar shell: compatible con rutas "Program Files" en Windows.
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const children=[]
let stopping=false
function run(label,relative){
  const child=spawn(process.execPath,[path.join(root,relative)],{cwd:root,stdio:'inherit',windowsHide:true,shell:false})
  children.push(child)
  child.on('error',err=>console.error(`${label}: ${err.message}`))
  child.on('exit',code=>{
    if(!stopping){ console.error(`${label} finalizó (${code}).`); stop(code||1) }
  })
}
function stop(code=0){
  if(stopping)return
  stopping=true
  for(const child of children){if(child.pid&&!child.killed)child.kill()}
  setTimeout(()=>process.exit(code),250).unref()
}
process.on('SIGINT',()=>stop(0))
process.on('SIGTERM',()=>stop(0))
run('API','server/index.mjs')
run('Frontend','node_modules/vite/bin/vite.js')
