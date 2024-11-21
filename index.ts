import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { SQSEvent, Context, Handler } from "aws-lambda";

class SQSService {
  client: SQSClient;
  queueUrl: string;

  constructor() {
    this.queueUrl = process.env.AWS_QUEUE_URL as string;

    this.client = new SQSClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
  }

  /**
   * Send a message to an SQS queue
   * @param {string} queueUrl - The URL of the SQS queue
   * @param {object} messageBody - The message to send
   * @returns {Promise<object>} - AWS response from sending message
   */
  async sendMessage(messageBody: Record<string, any>) {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(messageBody),
        // Optional parameters
        DelaySeconds: 0,
        MessageAttributes: {
          ContentType: {
            DataType: "String",
            StringValue: "application/json",
          },
        },
      });

      const response = await this.client.send(command);
      console.log("Message sent successfully:", response.MessageId);
      return response;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  /**
   * Receive messages from an SQS queue
   * @param {string} queueUrl - The URL of the SQS queue
   * @param {number} maxMessages - Maximum number of messages to receive
   * @returns {Promise<Array>} - Received messages
   */
  async receiveMessages(maxMessages = 10) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: 20, // Long polling
        MessageAttributeNames: ["All"],
        VisibilityTimeout: 30, // Time message is invisible to other consumers
      });

      const response = await this.client.send(command);

      if (response.Messages) {
        console.log(`Received ${response.Messages.length} messages`);
        return response.Messages;
      }

      console.log("No messages received");
      return [];
    } catch (error) {
      console.error("Error receiving messages:", error);
      throw error;
    }
  }

  /**
   * Delete a message from the queue after processing
   * @param {string} queueUrl - The URL of the SQS queue
   * @param {string} receiptHandle - The receipt handle of the message to delete
   * @returns {Promise<object>} - AWS response from deleting message
   */
  async deleteMessage(receiptHandle: string) {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });

      const response = await this.client.send(command);
      console.log("Message deleted successfully");
      return response;
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  }

  /**
   * Process messages from the queue
   * @param {string} queueUrl - The URL of the SQS queue
   */
  async processMessages() {
    try {
      const messages = await this.receiveMessages();
      console.log("Messages", messages);

      return messages;
      //   for (const message of messages) {
      //     try {
      //       // Parse the message body
      //       const messageBody = JSON.parse(message.Body ?? "");

      //       // Process the message (replace with your actual processing logic)
      //       console.log("Processing message:", messageBody);

      //       // Delete the message after successful processing
      //       await this.deleteMessage(message.ReceiptHandle as string);
      //     } catch (processingError) {
      //       console.error("Error processing message:", processingError);
      //       // Optionally implement error handling or move to dead-letter queue
      //     }
      //   }
    } catch (error) {
      console.error("Error in message processing:", error);
    }
  }
}

// // Example usage
// async function main() {
//   const sqsService = new SQSService();

//   //   // Send a message
//   //   await sqsService.sendMessage({
//   //     id: Date.now(),
//   //     type: "user_signup",
//   //     data: {
//   //       username: "johndoe",
//   //       email: "john@example.com",
//   //     },
//   //   });

//   // Process messages
//   await sqsService.processMessages();
// }

// // Run the main function
// main().catch(console.error);
const sqsService = new SQSService();

export const handler: Handler = async (event: SQSEvent, context: Context) => {
  // Process messages
  console.log(event, context);

  await sqsService.sendMessage(event);
  return await sqsService.processMessages();
};
