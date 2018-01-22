import whenChanged from './whenChanged'
import { deserializeProject } from '../utils/serialization';
import {getProject} from '../store/reducers/reducerHelpers'
import Project from '../records/Project'
import * as Init from '../logic/Init'
import HyperMerge from '../lib/HyperMerge';

export default store => {
  const {dispatch} = store

  const clientId = +(process.env.CLIENT_ID || 0)

  document.title = `pixelpusher client ${clientId}`

  whenChanged(store, state => state.isLoaded, isLoaded => {
    if (isLoaded) initSync()
  })

  function initSync() {
    const sync = global.sync = new HyperMerge({
      peerInfo: store.getState().present.peerInfo.toJS(),
      port: 3282 + clientId,
      path: `./.data/pixelpusher-v6/client-${clientId}`,
      onFork(project) {
        project.id = project._actorId
      },
    }).once('ready', _syncReady)
  }

  function _syncReady(sync) {
    sync.openAll()

    if (!sync.any()) {
      dispatch({type: 'NEW_PROJECT_CLICKED'})
    }

    whenChanged(store, state => state.peerInfo, info => {
      sync.peerInfo = info.toJS()
    })

    whenChanged(store, state => state.createdProjectCount, shouldCreate => {
      if (!shouldCreate) return

      const project = Init.project(sync.create())

      dispatch({type: "PROJECT_CREATED", project})
    })

    whenChanged(store, getProject, project => {
      sync.update(project)
    })

    whenChanged(store, state => state.projects.keySeq(), (ids, pIds) => {
      if (!pIds) return

      pIds.forEach(id => {
        if (!ids.includes(id)) sync.delete(id)
      })
    })

    whenChanged(store, state => state.clonedProjectId, id => {
      if (!id) return

      const project = sync.fork(id)
      dispatch({type: 'PROJECT_CLONED', project})
    })

    whenChanged(store, state => state.openingProjectId, id => {
      if (!id) return
      sync.open(id)
    })

    sync.on('document:ready', project => {
      if (!project.get('id')) return
      dispatch({type: "REMOTE_PROJECT_OPENED", project})
    })

    sync.on('document:updated', project => {
      // TODO this fires for my changes too
      dispatch({type: "REMOTE_PROJECT_UPDATED", project})
    })

    sync.on('merge:listening', merge => {
      const key = merge.key.toString('hex')
      const id = (merge.local || merge.source).id.toString('hex')

      dispatch({type: 'SELF_CONNECTED', key, id})
    })

    sync.on('merge:joined', (merge, {id, info}) => {
      const key = merge.key.toString('hex')
      dispatch({type: 'PEER_CONNECTED', key, id, info})

      const {avatarKey} = info.peerInfo || {}
      if (avatarKey) sync.openDocument(avatarKey)
    })

    sync.on('merge:left', (merge, {id}) => {
      const key = merge.key.toString('hex')
      dispatch({type: 'PEER_DISCONNECTED', key, id})
    })
  }
}
