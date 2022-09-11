import { V1Container, V1PodSpec } from '@kubernetes/client-node'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { IAdmission } from '../services/admission'
import { TYPES } from '../types'

export function AdmissionController (instance: FastifyInstance, opts: FastifyPluginOptions, done: Function) {
  instance.log.info('Registering AdmissionController')
  const admissionService = instance.inversifyContainer.get<IAdmission>(TYPES.Services.Admission)
  const processStats : Record<string, unknown> = {}
  processStats.requestsServed = 0

  instance.post('/', async (req, reply) => {
    const body: any = req.body
    const images : string[] = []
    if (body.kind === 'AdmissionReview' && body.request.operation === 'CREATE' && body.request.kind.kind === 'Pod') {
      const newPod: V1PodSpec = body.request.object.spec
      const pushImage = (c: V1Container) => {
        images.push(c.image as string)
      }
      if (Array.isArray(newPod.containers)) {
        newPod.containers.forEach(pushImage)
      }
      if (Array.isArray(newPod.initContainers)) {
        newPod.initContainers?.forEach(pushImage)
      }
      if (Array.isArray(newPod.ephemeralContainers)) {
        newPod.ephemeralContainers?.forEach(pushImage)
      }
      instance.log.info(`Detected images in pod create request = [${images.join(',')}]`)
    }
    const allow = await admissionService.allowAdmission(images)
    if (!allow) {
      instance.log.warn(`Blocked creating pod with images = [${images.join(',')}]`)
    }
    reply.send({
      apiVersion: 'admission.k8s.io/v1',
      kind: 'AdmissionReview',
      response: {
        uid: body.request.uid,
        allowed: allow,
        status: {
          message: `One of the images in [${images.join(',')}] is not allowed, denied`
        }
      }
    })
    processStats.requestsServed = (processStats.requestsServed as number) + 1
  })

  instance.get('/meta', async (req, reply) => {
    reply.send(processStats)
  })
  done()
  instance.log.info('Finished Registering AdmissionController')
}
