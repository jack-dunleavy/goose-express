import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { badRequestErrors, notFoundErrors } from "../lib/error-messages";
import { BadRequestError } from "../lib/errors";
import startMongoose from "../test-helpers/start-mongoose";
import { stringifyMongoIDs } from "../test-helpers/stringify-ids";
import app, { errorHandler, TestModel } from "./app.spec";

const testDoc1 = {
  _id: "5ec2d0193fd8c5d9b72948cc",
  name: "name1",
  optionalField: "optional1",
  singleChild: {
    _id: "5ec2d0193fd8c5d9b7294000",
    firstName: "Jamie",
    deeplyNested: [],
  },
  nested: [
    {
      _id: "5ec6883310e1ed67162a0c96",
      dayOfWeek: "Monday",
      activity: "Football",
      deeplyNested: [
        {
          _id: "5ec6883310e1ed67162a0a00",
          deepField: "Deep House",
          deepOptional: "Deep Optional",
        },
        {
          _id: "5ec6883310e1ed67162a0a01",
          deepField: "Deep Ocean",
        },
      ],
    },
    {
      _id: "5ec6883310e1ed67162a0c97",
      dayOfWeek: "Tuesday",
      activity: "Floral Art",
      deeplyNested: [],
    },
  ],
  __v: 0,
};

const testDoc2 = {
  _id: "5ec2d0193fd8c5d9b72948cd",
  name: "name2",
  singleChild: {
    _id: "5ec2d0193fd8c5d9b7294001",
    firstName: "Frank",
    deeplyNested: [],
  },
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

let mongoServer: MongoMemoryServer;

describe("The PUT /:id handler", () => {
  beforeAll(async () => {
    mongoServer = await startMongoose();
  });

  afterAll(async () => {
    await TestModel.findByIdAndDelete(testDoc2._id);
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TestModel.create(testDoc1);
  });

  afterEach(async () => {
    await TestModel.findByIdAndDelete(testDoc1._id);
    jest.clearAllMocks();
  });

  describe("When the request specifies a document by query", () => {
    it("should update the specified document", async () => {
      const query = { name: "name1" };
      await request(app)
        .put(`?query=${JSON.stringify(query)}`)
        .send({ name: "FOUND_AND_UPDATED" })
        .expect(200)
        .expect("content-type", /json/);

      const doc = await TestModel.findById(testDoc1._id, "", { lean: true });

      expect(doc).toEqual({
        _id: new mongoose.Types.ObjectId(testDoc1._id),
        name: "FOUND_AND_UPDATED",
        nested: [],
      });
    });

    it("should return null if the document did not match", async () => {
      const query = { name: "no match" };
      const response = await request(app)
        .put(`?query=${JSON.stringify(query)}`)
        .send({ name: "abc" })
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data).toEqual(null);
    });
  });

  describe("When the request is for a specific document", () => {
    it("Should update the specified document", async () => {
      await request(app)
        .put(`/${testDoc1._id}`)
        .send({
          name: "UPDATED",
          nested: [],
        })
        .expect(200);

      const doc = await TestModel.findById(testDoc1._id, "", { lean: true });

      expect(doc).toEqual({
        _id: new mongoose.Types.ObjectId(testDoc1._id),
        name: "UPDATED",
        nested: [],
        __v: 0,
      });
    });

    it("Should create the document if it does not exist", async () => {
      await request(app).put(`/${testDoc2._id}`).send(testDoc2).expect(200);

      const doc = await TestModel.findById(testDoc2._id, "", { lean: true });

      expect(stringifyMongoIDs(doc)).toEqual(testDoc2);
    });

    it("Should reject requests with invalid ids", async () => {
      await request(app).put(`/fakeID`).send({ name: "NOT ACCEPTED" });

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(notFoundErrors.idInvalid("fakeID")),
        []
      );
    });

    it("Should not make updates that invalidate the schema", async () => {
      await request(app)
        .put(`/${testDoc1._id}`)
        .send({ name: { invalid: "format" } });

      const doc = await TestModel.findById(testDoc1._id, "", { lean: true });

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.validationFailed),
        [
          {
            location: "body",
            msg:
              'Cast to string failed for value "{ invalid: \'format\' }" at path "name"',
            path: "name",
          },
        ]
      );

      expect(stringifyMongoIDs(doc)).toEqual(testDoc1);
    });
  });

  describe("When the request is for a subDocument", () => {
    it("Should update the subdocument specified by ID", async () => {
      const response = await request(app)
        .put(`/${testDoc1._id}/nested/${testDoc1.nested[0]._id}`)
        .send({
          dayOfWeek: "Saturday",
          activity: "Knitting",
          deeplyNested: [],
        })
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body).toEqual({
        data: {
          ...testDoc1,
          nested: [
            {
              _id: "5ec6883310e1ed67162a0c96",
              dayOfWeek: "Saturday",
              activity: "Knitting",
              deeplyNested: [],
            },
            {
              _id: "5ec6883310e1ed67162a0c97",
              dayOfWeek: "Tuesday",
              activity: "Floral Art",
              deeplyNested: [],
            },
          ],
        },
      });
    });

    it("Should update deeply nested subdocuments", async () => {
      const response = await request(app)
        .put(
          `/${testDoc1._id}/nested/${testDoc1.nested[0]._id}/deeplyNested/${testDoc1.nested[0].deeplyNested[0]._id}`
        )
        .send({
          deepField: "UPDATED",
        })
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data.nested[0].deeplyNested[0].deepField).toEqual(
        "UPDATED"
      );
    });
  });
});
