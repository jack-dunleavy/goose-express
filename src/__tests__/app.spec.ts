import bodyParser from "body-parser";
import express, { NextFunction, Request, Response } from "express";
import { model, Schema } from "mongoose";
import request from "supertest";
import GooseExpress from "..";

const app = express();

app.use(bodyParser.json());

export const errorHandler = jest.fn();

const DeeplyNestedSchema = new Schema({
  deepField: { type: String, required: true },
  deepOptional: String,
});

const NestedSchema = new Schema({
  dayOfWeek: { type: String, required: true },
  activity: { type: String, required: true },
  deeplyNested: [DeeplyNestedSchema],
});

const SingleChild = new Schema({
  firstName: { type: String, required: true },
  deeplyNested: [DeeplyNestedSchema],
});

const TestSchema = new Schema({
  name: { type: String, required: true },
  optionalField: String,
  nested: [NestedSchema],
  singleChild: SingleChild,
});

export const TestModel = model("test", TestSchema);
const testController = new GooseExpress(TestModel, { waitForIndex: true });

app.get("/health", (req: Request, res: Response) => {
  return res.sendStatus(200);
});

app.use("/", testController.createRouter());

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (!err.code) {
    return res.sendStatus(500);
  }

  errorHandler(err, err.detail || []);
  return res.status(err.code).send({ error: err });
});

it("Should be running", async () => {
  await request(app).get("/health").expect(200);
});

export default app;
