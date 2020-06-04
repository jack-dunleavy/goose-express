import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import {
  badRequestDetail,
  badRequestErrors,
  notFoundErrors,
} from "../lib/error-messages";
import { BadRequestError, NotFoundError } from "../lib/errors";
import startMongoose from "../test-helpers/start-mongoose";
import { stringifyMongoIDs } from "../test-helpers/stringify-ids";
import app, { errorHandler, TestModel } from "./app.spec";

const testDoc1 = {
  _id: "5ec2d0193fd8c5d9b72948cc",
  name: "name1",
  optionalField: "optional1",
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
const unusedID = "5ec2d1193fd8c5d9b72948cd";

let mongoServer: MongoMemoryServer;

describe("The PATCH / handler", () => {
  beforeAll(async () => {
    mongoServer = await startMongoose();
  });

  afterAll(async () => {
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

  describe("When the request is for the collection", () => {
    it("Should update matching documents", async () => {
      const query = { name: "name1" };
      const response = await request(app)
        .patch(`/?query=${JSON.stringify(query)}`)
        .send({
          optionalField: "optional123",
        })
        .expect(200)
        .expect("content-type", /json/);

      const doc = await TestModel.findById(testDoc1._id, "", { lean: true });

      expect(stringifyMongoIDs(doc)).toEqual({
        ...testDoc1,
        optionalField: "optional123",
      });

      expect(response.body).toEqual({
        n: 1,
        nModified: 1,
        ok: 1,
      });
    });

    it("Should reject requests with invalid query format", async () => {
      await request(app).patch(`?query=nonJSON`);

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.parsingQueryParamFailed("query")),
        badRequestDetail.parsingQueryParamFailed("query")
      );
    });
  });

  describe("When the request specifies a document by ID", () => {
    it("Should update the specified document", async () => {
      const response = await request(app)
        .patch(`/${testDoc1._id}`)
        .send({
          optionalField: "PATCHED",
        })
        .expect(200)
        .expect("content-type", /json/);

      const doc = await TestModel.findById(testDoc1._id, "", { lean: true });

      expect(stringifyMongoIDs(doc)).toEqual({
        ...testDoc1,
        optionalField: "PATCHED",
      });

      expect(response.body).toEqual({
        ...testDoc1,
        optionalField: "PATCHED",
      });
    });

    it("Should not make updates that invalidate the schema", async () => {
      await request(app).patch(`/${testDoc1._id}`).send({
        anotherOne: "INVALID",
        name: null,
      });

      const doc = await TestModel.findById(testDoc1._id, "", { lean: true });

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.validationFailed),
        [
          {
            location: "body",
            msg: "Path `name` is required.",
            path: "name",
          },
        ]
      );

      expect(stringifyMongoIDs(doc)).toEqual(testDoc1);
    });

    it("Should throw a NOT FOUND error when the document does not exist", async () => {
      await request(app).patch(`/${unusedID}`);

      expect(errorHandler).toHaveBeenCalledWith(
        new NotFoundError(notFoundErrors.idNotFound(unusedID)),
        []
      );
    });
  });

  describe("When updating a field on a document", () => {
    it("Should update the field", async () => {
      const response = await request(app)
        .patch(`/${testDoc1._id}/name`)
        .send({
          update: "NEW NAME",
        })
        .expect(200)
        .expect("content-type", /json/);
      expect(response.body).toEqual({
        data: {
          ...testDoc1,
          name: "NEW NAME",
        },
      });
    });
  });

  describe("When updating a nested document", () => {
    it("Should update the nested document", async () => {
      const response = await request(app)
        .patch(`/${testDoc1._id}/nested/${testDoc1.nested[0]._id}`)
        .send({
          dayOfWeek: "Thursday",
        })
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data.nested[0].dayOfWeek).toEqual("Thursday");
      expect(response.body.data.nested[0].activity).toEqual("Football");
    });

    it("Should update fields on the nested document", async () => {
      const response = await request(app)
        .patch(`/${testDoc1._id}/nested/${testDoc1.nested[0]._id}/dayOfWeek`)
        .send({
          update: "Saturday",
        })
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data.nested[0].dayOfWeek).toEqual("Saturday");
    });

    it("Should not update fields that do not exist", async () => {
      const response = await request(app)
        .patch(`/${testDoc1._id}/nested/${testDoc1.nested[0]._id}/foo`)
        .send({
          update: "Saturday",
        })
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data.nested[0].foo).toBeUndefined();
    });

    it("Should not update fields with invalid values", async () => {
      await request(app)
        .patch(`/${testDoc1._id}/nested/${testDoc1.nested[0]._id}`)
        .send({
          dayOfWeek: {
            invalid: "format",
          },
        });

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.validationFailed),
        [
          {
            location: "body",
            msg:
              'Cast to string failed for value "{ invalid: \'format\' }" at path "dayOfWeek"',
            path: "dayOfWeek",
          },
        ]
      );
    });
  });
});
