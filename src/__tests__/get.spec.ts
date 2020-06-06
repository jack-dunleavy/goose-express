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
const unusedID = "5ec2d1193fd8c5d9b72948cd";

let mongoServer: MongoMemoryServer;

describe("The GET / handler", () => {
  beforeAll(async () => {
    mongoServer = await startMongoose();
    await TestModel.create(testDoc1);
    await TestModel.create(testDoc2);
  });

  afterAll(async () => {
    await TestModel.findByIdAndDelete(testDoc1._id);
    await TestModel.findByIdAndDelete(testDoc2._id);
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Should fetch all records", async () => {
    const response = await request(app)
      .get("/")
      .expect(200)
      .expect("content-type", /json/);
    expect(response.body.data).toEqual([testDoc1, testDoc2]);
  });

  describe("The 'query' query parameter", () => {
    it("Should fetch records matching the query", async () => {
      const query = { name: "name1" };
      const response = await request(app)
        .get(`?query=${JSON.stringify(query)}`)
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data).toEqual([testDoc1]);
    });

    it("Should reject requests with invalid query format", async () => {
      await request(app).get(`?query=nonJSON`);

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.parsingQueryParamFailed("query")),
        badRequestDetail.parsingQueryParamFailed("query")
      );
    });
  });

  describe("The 'findOne' query parameter", () => {
    it("Should find the first matching document", async () => {
      const query = { name: "name1" };
      const response = await request(app)
        .get(`?query=${JSON.stringify(query)}&multiplicity=one`)
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data).toEqual(testDoc1);
    });

    it("Should honor explicit setting to false", async () => {
      const query = { name: "name1" };
      const response = await request(app)
        .get(`?query=${JSON.stringify(query)}&multiplicity=many`)
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data).toEqual([testDoc1]);
    });
  });

  describe("The 'fields' query parameter", () => {
    it("Should return only the requested fields", async () => {
      const fields = ["name", "__v"];
      const response = await request(app)
        .get(`?fields=${JSON.stringify(fields)}`)
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data).toEqual([
        {
          _id: testDoc1._id,
          name: "name1",
          __v: 0,
        },
        {
          _id: testDoc2._id,
          name: "name2",
          __v: 0,
        },
      ]);
    });

    it("Should allow omission of the _id field", async () => {
      const fields = ["-_id", "name"];
      const response = await request(app).get(
        `?fields=${JSON.stringify(fields)}`
      );

      expect(response.body.data).toEqual([
        {
          name: testDoc1.name,
        },
        {
          name: testDoc2.name,
        },
      ]);
    });

    it("Should ignore fields that are not strings", async () => {
      const fields = [
        3,
        null,
        { who: "does this" },
        ["nested", "also", "ignored"],
        "name",
        "-_id",
      ];
      const response = await request(app).get(
        `?fields=${JSON.stringify(fields)}`
      );

      expect(response.body.data).toEqual([
        {
          name: testDoc1.name,
        },
        {
          name: testDoc2.name,
        },
      ]);
    });

    it("Should reject requests that contain both exclusions and inclusions", async () => {
      const fields = ["-name", "optionalField"];
      await request(app).get(`?fields=${JSON.stringify(fields)}`);

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.projectionInvalid),
        badRequestDetail.projectionInvalid
      );
    });

    it("Should reject requests with invalid fields format", async () => {
      await request(app).get(`?fields=foo`);

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.parsingQueryParamFailed("fields")),
        badRequestDetail.parsingQueryParamFailed("fields")
      );
    });
  });

  describe("When the query contains a document ID", () => {
    it("Should return the specified document", async () => {
      const response = await request(app)
        .get(`/${testDoc1._id}`)
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data).toEqual(testDoc1);
    });

    it("Should reject requests with invalid mongoIDs", async () => {
      await request(app).get(`/invalid`);

      expect(errorHandler).toHaveBeenCalledWith(
        new NotFoundError(notFoundErrors.idInvalid("invalid")),
        []
      );
    });

    it("Should throw a NOT FOUND error when the document does not exist", async () => {
      await request(app).get(`/${unusedID}`);

      expect(errorHandler).toHaveBeenCalledWith(
        new NotFoundError(notFoundErrors.idNotFound(unusedID)),
        []
      );
    });
  });

  describe("When the query is for a nested field", () => {
    it("Should fetch the nested records", async () => {
      const response = await request(app)
        .get(`/${testDoc1._id}/nested`)
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data).toEqual(testDoc1.nested);
    });

    it("Should fetch deeply nested records", async () => {
      const response = await request(app)
        .get(`/${testDoc1._id}/nested/${testDoc1.nested[0]._id}/deeplyNested`)
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data).toEqual(testDoc1.nested[0].deeplyNested);
    });

    it("Should fetch deeply nested records by ID", async () => {
      const response = await request(app)
        .get(
          `/${testDoc1._id}/nested/${testDoc1.nested[0]._id}/deeplyNested/${testDoc1.nested[0].deeplyNested[0]._id}`
        )
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data).toEqual(testDoc1.nested[0].deeplyNested[0]);
    });

    it("should return fields on nested documents", async () => {
      const response = await request(app)
        .get(`/${testDoc1._id}/nested/${testDoc1.nested[0]._id}/dayOfWeek`)
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body).toEqual({ data: "Monday" });
    });

    it("Should throw a BAD REQUEST error when an invalid key is specified", async () => {
      await request(app).get(`/${testDoc1._id}/missing`);

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.keyNotFound("missing")),
        []
      );
    });

    it("Should throw a BAD REQUEST error when an invalid key is specified", async () => {
      await request(app).get(
        `/${testDoc1._id}/nested/${testDoc1.nested[0]._id}/invalid`
      );

      expect(errorHandler).toHaveBeenCalledWith(
        new BadRequestError(badRequestErrors.keyNotFound("invalid")),
        []
      );
    });

    it("Should throw a NOT FOUND error when an invalid ID is specified", async () => {
      await request(app).get(`/${testDoc1._id}/nested/${unusedID}/invalid`);

      expect(errorHandler).toHaveBeenCalledWith(
        new NotFoundError(notFoundErrors.idNotFound(unusedID)),
        []
      );
    });
  });
});
