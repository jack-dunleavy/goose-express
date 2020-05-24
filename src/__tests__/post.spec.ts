import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { badRequestErrors } from "../lib/error-messages";
import { BadRequestError } from "../lib/errors";
import startMongoose from "../test-helpers/start-mongoose";
import app, { errorHandler, TestModel } from "./app.spec";

let mongoServer: MongoMemoryServer;

const testDoc1 = {
  _id: "5ec2d0193fd8c5d9b72948ce",
  name: "name1",
  singleChild: {
    _id: "5ec2d0193fd8c5d9b7294000",
    firstName: "Jamie",
    deeplyNested: [],
  },
  nested: [
    {
      _id: "5ec6883310e1ed67162a0c98",
      dayOfWeek: "Friday",
      activity: "Shopping",
      deeplyNested: [],
    },
  ],
  __v: 0,
};
const testDoc2 = {
  _id: "5ec2d0193fd8c5d9b72948cd",
  name: "name2",
  nested: [
    {
      _id: "5ec6883310e1ed67162a0c98",
      dayOfWeek: "Wednesday",
      activity: "Karate",
      deeplyNested: [],
    },
  ],
  __v: 0,
};

describe("The POST / handler", () => {
  beforeAll(async () => {
    mongoServer = await startMongoose();
  });

  afterAll(async () => {
    await TestModel.deleteOne({ name: "Post Test 1" });
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TestModel.create(testDoc1);
    await TestModel.create(testDoc2);
  });

  afterEach(async () => {
    await TestModel.findByIdAndDelete(testDoc1._id);
    await TestModel.findByIdAndDelete(testDoc2._id);
    jest.clearAllMocks();
  });

  describe("When the request is for the root level", () => {
    it("Should create the document", async () => {
      const response = await request(app)
        .post("/")
        .send({
          name: "Post Test 1",
          optionalField: "optional1",
        })
        .expect(201)
        .expect("content-type", /json/);

      expect(response.body).toEqual({
        _id: expect.any(String),
        name: "Post Test 1",
        optionalField: "optional1",
        nested: [],
        __v: 0,
      });

      const mongoDoc = await TestModel.findById(response.body._id);
      expect(mongoDoc).toBeDefined();
    });

    it("Should reject requests that fail mongoose validation", async () => {
      await request(app).post("/").send({
        optionalField: "optional1",
      });

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.validationFailed),
        [{ location: "body", msg: "Path `name` is required.", path: "name" }]
      );
    });
  });

  describe("When the request is for nested fields", () => {
    it("Should add to the nested records", async () => {
      const response = await request(app)
        .post(`/${testDoc2._id}/nested`)
        .send({
          dayOfWeek: "Thursday",
          activity: "Cooking",
        })
        .expect(201)
        .expect("content-type", /json/);

      expect(response.body).toEqual({
        data: {
          ...testDoc2,
          nested: [
            ...testDoc2.nested,
            {
              _id: expect.any(String),
              dayOfWeek: "Thursday",
              activity: "Cooking",
              deeplyNested: [],
            },
          ],
        },
      });
    });

    it("Should add to the deeply nested records", async () => {
      const response = await request(app)
        .post(`/${testDoc1._id}/nested/${testDoc1.nested[0]._id}/deeplyNested`)
        .send({ deepField: "Deep Convo" })
        .expect(201)
        .expect("content-type", /json/);

      expect(response.body).toEqual({
        data: {
          ...testDoc1,
          nested: [
            {
              ...testDoc1.nested[0],
              deeplyNested: [
                {
                  _id: expect.any(String),
                  deepField: "Deep Convo",
                },
              ],
            },
          ],
        },
      });
    });

    it("Should add to deeply nested arrays within single children", async () => {
      const response = await request(app)
        .post(`/${testDoc1._id}/singleChild/deeplyNested`)
        .send({
          deepField: "Deep Chasm",
        })
        .expect(201)
        .expect("content-type", /json/);

      expect(response.body).toEqual({
        data: {
          ...testDoc1,
          singleChild: {
            ...testDoc1.singleChild,
            deeplyNested: [
              {
                _id: expect.any(String),
                deepField: "Deep Chasm",
              },
            ],
          },
        },
      });
    });

    it("Should reject requests the invalidate the schema", async () => {
      await request(app).post(`/${testDoc2._id}/nested`).send({
        anotherOne: "OK",
        activity: "Bare Knuckle Boxing",
      });

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.validationFailed),
        [
          {
            location: "body",
            msg: "Path `dayOfWeek` is required.",
            path: "nested.*.dayOfWeek",
          },
        ]
      );
    });

    it("Should format deeply nested errors", async () => {
      await request(app)
        .post(`/`)
        .send({
          anotherOne: "OK",
          activity: "Bare Knuckle Boxing",
          nested: [
            {
              testPath: "1",
            },
          ],
        });

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.validationFailed),
        [
          {
            location: "body",
            msg: "Path `name` is required.",
            path: "name",
          },
          {
            location: "body",
            msg: "Path `activity` is required.",
            path: "nested.0.activity",
          },
          {
            location: "body",
            msg: "Path `dayOfWeek` is required.",
            path: "nested.0.dayOfWeek",
          },
        ]
      );
    });
  });
});
