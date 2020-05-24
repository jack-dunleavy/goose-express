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
import app, { errorHandler, TestModel } from "./app.spec";

const testDoc1 = {
  _id: "5ec2d0193fd8c5d9b72948ce",
  name: "name1",
  nested: [
    {
      _id: "5ec6883310e1ed67162a0c98",
      dayOfWeek: "Friday",
      activity: "Shopping",
      deeplyNested: [
        {
          _id: "5ec6883310e1ed67162a2c02",
          deepField: "Space",
        },
      ],
    },
  ],
  singleChild: {
    _id: "5ec6883310e1ed67162a2c00",
    firstName: "Bob",
    deeplyNested: [
      {
        _id: "5ec6883310e1ed67162a2c01",
        deepField: "Telescope",
      },
    ],
  },
  __v: 0,
};
const unusedID = "5ec2d0193fd8c5d9b72948cf";

let mongoServer: MongoMemoryServer;

describe("The DELETE / handler", () => {
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

  describe("When the delete request is at the collection level", () => {
    it("Should delete the specified documents", async () => {
      const query = { name: testDoc1.name };
      const response = await request(app)
        .delete(`/?query=${JSON.stringify(query)}`)
        .expect(200);

      expect(response.body).toEqual({
        n: 1,
        ok: 1,
        deletedCount: 1,
      });

      const doc = await TestModel.findById(testDoc1._id, "", { lean: true });

      expect(doc).toBeNull();
    });

    it("Should reject requests without a query specified", async () => {
      await request(app).delete("/");

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.queryParameterRequired("query")),
        badRequestDetail.queryParameterRequired("query")
      );
    });

    it("Should reject requests with a malformed query", async () => {
      await request(app).delete("/?query=foo");

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.parsingQueryParamFailed("query")),
        badRequestDetail.parsingQueryParamFailed("query")
      );
    });
  });

  describe("When an ID is specified", () => {
    it("Should delete the specified document", async () => {
      await request(app).delete(`/${testDoc1._id}`).expect(204);

      const doc = await TestModel.findById(testDoc1._id, "", { lean: true });

      expect(doc).toBeNull();
    });

    it("Should return not found for resources that do not exist", async () => {
      await request(app).delete(`/${unusedID}`);

      expect(errorHandler).toHaveBeenCalledWith(
        new NotFoundError(notFoundErrors.idNotFound(unusedID)),
        []
      );
    });
  });

  describe("When the delete request is for nested documents", () => {
    it("Should delete the nested document", async () => {
      const response = await request(app)
        .delete(`/${testDoc1._id}/nested/${testDoc1.nested[0]._id}`)
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body).toEqual({
        data: {
          ...testDoc1,
          nested: [],
        },
      });
    });

    it("Should delete subdocuments of single child nested documents", async () => {
      const response = await request(app)
        .delete(
          `/${testDoc1._id}/singleChild/deeplyNested/${testDoc1.singleChild.deeplyNested[0]._id}`
        )
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body).toEqual({
        data: {
          ...testDoc1,
          singleChild: {
            ...testDoc1.singleChild,
            deeplyNested: [],
          },
        },
      });
    });

    it("Should traverse arrays to delete deeply nested documents", async () => {
      const response = await request(app).delete(
        `/${testDoc1._id}/nested/${testDoc1.nested[0]._id}/deeplyNested/${testDoc1.nested[0].deeplyNested[0]._id}`
      );

      expect(response.body).toEqual({
        data: {
          ...testDoc1,
          nested: [
            {
              ...testDoc1.nested[0],
              deeplyNested: [],
            },
          ],
        },
      });
    });

    it("Should return a NOT FOUND error when the document ID is invalid", async () => {
      await request(app).delete(`/invalid/nested/${testDoc1.nested[0]._id}`);

      expect(errorHandler).toHaveBeenCalledWith(
        new NotFoundError(notFoundErrors.idInvalid("invalid")),
        []
      );
    });
  });
});
