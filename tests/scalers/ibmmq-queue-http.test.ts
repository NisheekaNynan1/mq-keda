import * as async from 'async'
import * as fs from 'fs'
import * as sh from 'shelljs'
import * as tmp from 'tmp'
import test from 'ava'
import { IBMMQHelper } from './ibmmq-helpers'

const testNamespace = 'ibmmq-queue-test'
const ibmmqNamespace = 'ibmmq-test'
const queueName = 'hello'
const username = "test-user"
const password = "test-password"
const vhost = "test-vh"
const connectionString = `amqp://${username}:${password}@ibmmq.${ibmmqNamespace}.svc.cluster.local/${vhost}`   //needs to change
const messageCount = 250

test.before(t => {
  IBMMQHelper.installIBMMQ(t, ibmmqNamespace)

  // sh.config.silent = true
  // // create deployment
  // const httpConnectionString = `http://${username}:${password}@ibmmq.${ibmmqNamespace}.svc.cluster.local/${vhost}`

  //IBMMQHelper.createDeployment(t, testNamespace, deployYaml, connectionString, httpConnectionString, queueName)
})

//Just testing, pod & namespace gets created, test passes, use: npx ava ibmmq-queue-http.test.ts
test.serial('test_hello_world', t => {
  console.log('Hello World')
  t.is(0, 0)
  // const replicaCount = sh.exec(
  //   `kubectl get deployment.apps/test-deployment --namespace ${testNamespace} -o jsonpath="{.spec.replicas}"`
  // ).stdout
  // t.is(replicaCount, '0', 'replica count should start out as 0')
})

// test.serial(`Deployment should scale to 4 with ${messageCount} messages on the queue then back to 0`, t => {
//   IBMMQHelper.publishMessages(t, testNamespace, connectionString, messageCount)

//   // with messages published, the consumer deployment should start receiving the messages
//   let replicaCount = '0'
//   for (let i = 0; i < 10 && replicaCount !== '4'; i++) {
//     replicaCount = sh.exec(
//       `kubectl get deployment.apps/test-deployment --namespace ${testNamespace} -o jsonpath="{.spec.replicas}"`
//     ).stdout
//     t.log('replica count is:' + replicaCount)
//     if (replicaCount !== '4') {
//       sh.exec('sleep 5s')
//     }
//   }

//   t.is('4', replicaCount, 'Replica count should be 4 after 10 seconds')

//   for (let i = 0; i < 50 && replicaCount !== '0'; i++) {
//     replicaCount = sh.exec(
//       `kubectl get deployment.apps/test-deployment --namespace ${testNamespace} -o jsonpath="{.spec.replicas}"`
//     ).stdout
//     if (replicaCount !== '0') {
//       sh.exec('sleep 5s')
//     }
//   }

//   t.is('0', replicaCount, 'Replica count should be 0 after 3 minutes')
// })

// test.after.always.cb('clean up ibmmq-queue deployment', t => {
//   const resources = [
//     'scaledobject.keda.sh/test-scaledobject',
//     'secret/test-secrets-api',
//     'deployment.apps/test-deployment',
//   ]

//   for (const resource of resources) {
//     sh.exec(`kubectl delete ${resource} --namespace ${testNamespace}`)
//   }
//   sh.exec(`kubectl delete namespace ${testNamespace}`)
//   // remove ibmmq
//   IBMMQHelper.uninstallIBMMQ(ibmmqNamespace)
//   t.end()
// })

test.after.always.cb('clean up ibmmq-queue deployment', t => {
  
  // Remove IBM MQ
  IBMMQHelper.uninstallIBMMQ(ibmmqNamespace)
  t.end()

})

const deployYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ibmmq-consumer
  namespace: default
  labels:
    app: ibmmq-consumer
spec:
  selector:
    matchLabels:
      app: ibmmq-consumer
  template:
    metadata:
      labels:
        app: ibmmq-consumer
    spec:
      containers:
        - name: ibmmq-consumer
          image: kazada/sample-app:latest
          imagePullPolicy: Always
          command:
            - "/src/receive"
          args:
            - "5" # Optional. Number of seconds to sleep between each message. Default: 1
          env:
          - name: APP_USER
            valueFrom:
              secretKeyRef:
                name: ibmmq-secret
                key: APP_USER
          - name: APP_PASSWORD
            valueFrom:
              secretKeyRef:
                name: ibmmq-secret
                key: APP_PASSWORD
          - name: QMGR
            value: 'QM1' # Your queue manager
          - name: QUEUE_NAME
            value: 'DEMO.QUEUE' # Your queue name
          - name: HOST
            value: 'qm1-6d0c.qm2.eu-gb.mq.appdomain.cloud' # Your hostname
          - name: PORT
            value: '31274' # Your port number
          - name: CHANNEL
            value: 'CLOUD.APP.SVRCONN' # Your channel name
          - name: TOPIC_NAME
            value: 'dev/' # Your topic name
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: ibmmq-consumer
  namespace: default
  labels:
    deploymentName: ibmmq-consumer
spec:
  scaleTargetRef:
    name: ibmmq-consumer
  pollingInterval: 5 # Optional. Default: 30 seconds
  cooldownPeriod: 30 # Optional. Default: 300 seconds
  maxReplicaCount: 18 # Optional. Default: 100
  triggers:
    - type: ibmmq
      metadata:
        queueLength: '5' # Queue length target for HPA. Default: 5 messages
        host: 'https://web-qm1-6d0c.qm2.eu-gb.mq.appdomain.cloud/ibmmq/rest/v2/admin/action/qmgr/QM1/mqsc' # Your admin REST endpoint
        queueName: 'DEMO.QUEUE' # Your queue name
      authenticationRef:
        name: ibmmq-consumer-trigger
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: ibmmq-consumer-trigger
  namespace: default
spec:
  secretTargetRef:
    - parameter: username
      name: ibmmq-secret
      key: ADMIN_USER
    - parameter: password
      name: ibmmq-secret
      key: ADMIN_PASSWORD`
