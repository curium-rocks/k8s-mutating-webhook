import { inject, injectable } from 'inversify'
import { TYPES } from '../types'
import { Logger } from 'pino'
import { V1Pod, V1PodSpec } from '@kubernetes/client-node'

export interface IAdmission {
  admit(pod: V1Pod): Promise<V1Pod>
}

@injectable()
export class Admission implements IAdmission {
  private readonly logger: Logger

  constructor (
    @inject(TYPES.Services.Logging)parentLogger: Logger) {
    this.logger = parentLogger.child({ module: 'services/Admission' })
  }

  async admit (pod: V1Pod): Promise<V1Pod> {
    const spec = pod.spec as V1PodSpec
    if (!spec.securityContext) spec.securityContext = {}
    if (!spec.securityContext.runAsNonRoot) spec.securityContext.runAsNonRoot = true
    spec.containers = spec.containers.map((c) => {
      if (!c.securityContext) c.securityContext = {}
      if (c.securityContext.allowPrivilegeEscalation == null || c.securityContext.allowPrivilegeEscalation) c.securityContext.allowPrivilegeEscalation = false
      if (c.securityContext.privileged == null || c.securityContext.privileged) c.securityContext.privileged = false
      if (!c.securityContext.readOnlyRootFilesystem) c.securityContext.readOnlyRootFilesystem = true
      if (!c.securityContext.runAsNonRoot) c.securityContext.runAsNonRoot = true
      return c
    })
    return Promise.resolve(pod)
  }
}
