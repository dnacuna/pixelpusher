import {Record, List, Map} from 'immutable'
import Project from './Project'

export const DEFAULT_COLOR = '#313131';

const State = Record({
  currentProject: Project(),
  peers: Map(),
  currentColor: Map({color: '#000000', position: 0}),
  eraserOn: false,
  eyedropperOn: false,
  colorPickerOn: false,
  bucketOn: false,
  loading: false,
  notifications: List(),
  activeFrameIndex: 0,
  duration: 1
}, "State")

export default State