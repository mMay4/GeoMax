import {createContext,useCallback,useContext,useMemo,useState} from 'react'
import {useMapContext} from './MapContext'
const WorkspaceContext=createContext(null)
export function WorkspaceProvider({children}){
  const {setMeasureMode,setMeasureResult}=useMapContext()
  const [module,setModule]=useState(null)
  const [requestedLotId,setRequestedLotId]=useState(null)
  const [drawing,setDrawing]=useState(null)
  const [drawPoints,setDrawPoints]=useState([])
  const [captured,setCaptured]=useState(null)
  const open=useCallback(name=>{setModule(name);setRequestedLotId(null);setDrawing(null);setDrawPoints([])},[])
  // Abre el formulario de edición del lote seleccionado en el mapa.
  const openLotEditor=useCallback(lotId=>{setModule('lotes');setRequestedLotId(String(lotId));setDrawing(null);setDrawPoints([])},[])
  const clearRequestedLotId=useCallback(()=>setRequestedLotId(null),[])
  const close=useCallback(()=>{setModule(null);setRequestedLotId(null);setDrawing(null);setDrawPoints([])},[])
  const beginDrawing=useCallback(kind=>{setMeasureMode(null);setMeasureResult(null);setCaptured(null);setDrawPoints([]);setDrawing(kind)},[setMeasureMode,setMeasureResult])
  const addPoint=useCallback(point=>setDrawPoints(v=>[...v,point]),[])
  const finishDrawing=useCallback(()=>{
    if(drawing==='polygon'){
      if(drawPoints.length<3)return false
      setCaptured({type:'Polygon',coordinates:[[...drawPoints,drawPoints[0]]]})
    } else if(drawing==='point'){
      if(!drawPoints.length)return false
      setCaptured({type:'Point',coordinates:drawPoints[0]})
    } else return false
    setDrawing(null)
    setDrawPoints([])
    return true
  },[drawing,drawPoints])
  const cancelDrawing=useCallback(()=>{setDrawing(null);setDrawPoints([])},[])
  const value=useMemo(()=>({module,setModule,open,openLotEditor,requestedLotId,clearRequestedLotId,close,drawing,drawPoints,captured,setCaptured,beginDrawing,addPoint,finishDrawing,cancelDrawing}),
    [module,open,openLotEditor,requestedLotId,clearRequestedLotId,close,drawing,drawPoints,captured,setCaptured,beginDrawing,addPoint,finishDrawing,cancelDrawing])
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
export function useWorkspace(){const v=useContext(WorkspaceContext);if(!v)throw new Error('WorkspaceProvider requerido');return v}
