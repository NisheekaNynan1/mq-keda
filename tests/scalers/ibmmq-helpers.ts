import * as sh from 'shelljs'
import * as tmp from 'tmp'
import * as fs from 'fs'

export class IBMMQHelper {

  // Create an IBM app
    static installIBMMQ(t, ibmmqNamespace: string) {
        sh.exec(`kubectl create namespace ${ibmmqNamespace}`)
        t.is(0, sh.exec(`kubectl run ibmmq-pod --image=ibmcom/mq --env=LICENSE=accept --env=MQ_QMGR_NAME=qm1 --env MQ_APP_PASSWORD=passw0rd --env MQ_ADMIN_PASSWORD=betterPassw0rd --port=1414 --labels=app=qm1 qm1`).code, 'creating an IBM MQ App should work.')
        sh.exec(`kubectl wait --for=condition=Ready pod/ibmmq-pod`)
        
    }
  
    static uninstallIBMMQ(ibmmqNamespace: string) {
        sh.exec(`kubectl delete pod ibmmq-pod`)
        sh.exec(`kubectl delete namespace ${ibmmqNamespace}`)
    }

    // //get rid of amqpURI, change variable names, deploy 
    // static createDeployment(t, namespace: string, deployYaml: string, amqpURI: string, scaledObjectHost: string, queueName: string) {
    //     const base64ConStr = Buffer.from(scaledObjectHost).toString('base64')
    //     const tmpFile = tmp.fileSync()
    //     fs.writeFileSync(tmpFile.name, deployYaml.replace('{{CONNECTION_STRING_BASE64}}', base64ConStr)
    //         .replace('{{CONNECTION_STRING}}', amqpURI)
    //         .replace('{{QUEUE_NAME}}', queueName))
    //     sh.exec(`kubectl create namespace ${namespace}`)
    //     t.is(
    //         0,
    //         sh.exec(`kubectl apply -f ${tmpFile.name} --namespace ${namespace}`).code,
    //         'creating a deployment should work.'
    //     )
    // }

    // // Publish messages //no longer using tmpFile
    // static publishMessages(t, namespace: string, connectionString: string, messageCount: number) {
    //     fs.writeFileSync(tmpFile.name, publishYAML.replace('{{CONNECTION_STRING}}', connectionString)
    //         .replace('{{MESSAGE_COUNT}}', messageCount.toString()))
    //     t.is(
    //         0,
    //         sh.exec(`kubectl apply -f ${tmpFile.name} --namespace ${namespace}`).code,
    //         'publishing job should apply.'
    //     )

    //     // wait for the publishing job to complete
    //     for (let i = 0; i < 20; i++) {
    //         const succeeded = sh.exec(`kubectl get job ibmmq-publish --namespace ${namespace} -o jsonpath='{.status.succeeded}'`).stdout
    //         if (succeeded == '1') {
    //             break
    //         }
    //         sh.exec('sleep 1s')
    //     }
    // }

}

// YAML file which deploys publisher application and passes variables
const publishYAML = `apiVersion: batch/v1
kind: Job
metadata:
  name: ibmmq-publisher
spec:
  template:
    spec:
      containers:
        - name: ibmmq-client
          image: kazada/sample-app:latest
          imagePullPolicy: Always
          command:
            - "/src/send"
          args:
            - "100" # Optional. Number of messages to send. Default: 100
            - "1" # Optional. Number of seconds to sleep between sending a message. Default: 1
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
      restartPolicy: Never
  backoffLimit: 1`