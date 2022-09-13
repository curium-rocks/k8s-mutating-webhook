import { describe, it, expect } from '@jest/globals'
import 'reflect-metadata'
import { Admission } from '../../src/services/admission'
import pino from 'pino'
import { V1Pod } from '@kubernetes/client-node'

describe('services/admission', () => {
  const pinoLogger = pino({
    level: 'error'
  })
  it('Should mutate to a more secure setting', async () => {
    const service = new Admission(pinoLogger)
    const newPod: V1Pod = {
      spec: {
        containers: [{
          name: 'test',
          image: 'test'
        }]
      }
    }
    const mutatedPod = await service.admit(newPod)
    expect(mutatedPod.spec?.securityContext?.runAsNonRoot).toBeTruthy()
    mutatedPod.spec?.containers.forEach((c) => {
      expect(c.securityContext?.allowPrivilegeEscalation).toBeFalsy()
      expect(c.securityContext?.privileged).toBeFalsy()
      expect(c.securityContext?.readOnlyRootFilesystem).toBeTruthy()
      expect(c.securityContext?.runAsNonRoot).toBeTruthy()
    })
  })
  it('Should not mutate already secure pod', async () => {
    const service = new Admission(pinoLogger)
    const newPod: V1Pod = {
      spec: {
        securityContext: {
          runAsNonRoot: true
        },
        containers: [{
          name: 'test',
          image: 'test',
          securityContext: {
            runAsNonRoot: true,
            readOnlyRootFilesystem: true,
            privileged: false,
            allowPrivilegeEscalation: false
          }
        }]
      }
    }
    const nonMutatedPod = await service.admit(newPod)
    expect(nonMutatedPod).toEqual(newPod)
  })
})
