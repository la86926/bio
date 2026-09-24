import { describe, expect, it } from 'vitest'
import { synchronize } from '../services/sync'
import { demoState } from '../data/demo'

describe('sincronización',()=>{
  it('13b. conserva el trabajo local cuando Microsoft no está configurado',async()=>{
    const result=await synchronize({...demoState,pendingSync:true},{microsoft:{enabled:false,clientId:'',tenantId:'common',siteId:'',dataListId:'',usersListId:''}})
    expect(result.status).toBe('local-only')
    expect(result.state.pendingSync).toBe(false)
    expect(result.state.samples.length).toBe(demoState.samples.length)
  })
})
