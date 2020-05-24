# Goose Express

> I've extracted this module from a project I'm working on as I believe it has re-use value. If there are features you would like to see implemented please let me know via github, as I'm keen to extend it's functionality. Similarly if there are things that do not work as expected please raise these as issues.

**Stop re-writing the same express endpoints over and over again**

This library is an express suitable abstraction on top of the popular MongoDB ODM, [mongooose](https://mongoosejs.com/). It uses the models you've already written to expose an HTTP endpoint that follows best practices for the HTTP verbs GET, PUT, PATCH, DELETE, and POST.

## Get Started

There's no sense in re-hashing all of the excellent options and controls the mongoose library offers. For detail about defining schema and models visit their [documentation](https://mongoosejs.com/) directly. Our example centers around a contrived user record with a few fields:

1. Create your mongoose schema:

```js
import { Schema } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  isActive: Boolean,
});
```

1. Create your mongoose model:

```js
import { model } from "mongoose";

const UserModel = model("users", UserSchema);
```

1. Create a GooseExpress instance

```js
import GooseExpress from "goose-express";

const options = {};
const userController = new GooseExpress(UserModel, options);
```

1. Add the Goose Router to your app

```js
import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json()); // <--- You'll need to parse JSON payloads

app.use("/users", userController.createRouter());
```

That's it - your app will now include the following endpoints for interacting with the User model:

| Method | Use                              |
| ------ | -------------------------------- |
| GET    | Query users in Mongo             |
| POST   | Create a new user in Mongo       |
| PUT    | Create or Update a user in Mongo |
| DELETE | Delete a user from Mongo         |
| PATCH  | Update a user in Mongo           |

## Nested Documents

Embedded documents (see https://mongoosejs.com/docs/subdocs.html) are child schemas attached to the root document. The Goose Express library allows easy interaction with these via a consistent API. Take, for example, the following extension to our user schema which appends an array of phone numbers for the user:

```js
const PhoneNumberSchema = new Schema({
  isPrimary: { type: Boolean, required: true }
  number: { type: String, required: true }
})

const UserSchema = new Schema({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  isActive: Boolean,
  phoneNumbers: [PhoneNumberSchema]
});
```

This configuration tells mongoose to nest subdocuments for each phone number under the 'phoneNumbers' key in the user. Goose Express translates this interface into RESTful calls, allowing you to GET, POST, PUT, PATCH, and DELETE phone number records without lifting a finger. See the following sample requests for more detail:

```sh
# Get all phone number
# /users is the base path
# {userID} is the mongo ObjectID for the user
# phoneNumbers specifies the key within the model to query
curl -X GET /users/{userID}/phoneNumbers

# Add a phone number to the user
curl -X POST /users/{userID}/phoneNumbers -d '{"isPrimary": true, "number": "07232864332"}' -H "content-type: application/json"

# Update an existing phone number
# {phoneNumberID} is the ID of the phone number to update
# Note that the URL targets a key within the particular phone number for this patch request
curl -X PATCH /users/{userID}/phoneNumbers/{phoneNumberID}/isPrimary -d '{ "update": false }' -H "content-type: application/json"
```

## Path Behaviour

Goose Express has been designed to expose a predictable and easy-to-use interface. At the core of this is the use of path parameters to represent sections of the document. Each of the exposed endpoints honors this concept, allowing you to quickly design queries to perform CRUD operations on sections of each document.

More specifically, path segments that are Mongo ObjectIDs are assumed to reference a nested sub-document within an array, while other segments are assumed to refer to keys on the currently specified document. For example:

```sh
# GET a key on a specific user (the final parameter is 'name' so the targetted attribute is the user document's 'name' field)
curl -X GET /users/000000000000000000000000/name

# PUT a phone number into a users phone numbers (the final parameter is an OID, so the targetted document is specified by that OID in the phone numbers array)
curl -X PUT /users/000000000000000000000000/phoneNumbers/000000000000000000000001

# Similarly you could DELETE or GET this phone number after it was created by referencing it by OID
curl -X GET /users/000000000000000000000000/phoneNumbers/000000000000000000000001
```

## Validation

Goose Express simple exposes a RESTful interface onto mongoose models. As such, the API honors the validation configuration in those models. Validation errors are caught and passed to the next [error handling middleware](https://expressjs.com/en/guide/error-handling.html)

## Error Handling

When errors occur within Goose Express they are forwarded on to the next error handling middleware. To best handle these errors you should define a piece of express middleware that reads these errors and forwards them back to the client. This allows you to define how much or little of the error information you return to the caller. In general the `err.message` is for internal use (and contains useful debugging information), while `err.detail` is fit for most client's to consume.

```js
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  return res.status(err.code).send({ error: err });
});
```

The Errors produced by this module have the following format:

```ts
interface Error {
  code: number;
  reason: string;
  detail: [
    {
      msg: string;
      param?: string;
      path?: string;
      location?: string;
    }
  ];
}
```

The following errors can be produced by the module:

| Error           | Code | Reason       | Usage                                                   |
| --------------- | ---- | ------------ | ------------------------------------------------------- |
| BadRequestError | 400  | Bad Request  | An invalid request is supplied by the client            |
| NotFoundError   | 404  | Not Found    | The client has specified a resource that does not exist |
| InternalError   | 500  | Server Error | Something unexpected has happened                       |

## API

### Constructor Options

When intialising Goose Express you may supply the following options to adapt it's behaviour:

| Option       | Type    | Usage                                                                                              |
| ------------ | ------- | -------------------------------------------------------------------------------------------------- |
| waitForIndex | boolean | Specify to tell Goose Express to allow the indexes on a field to compile before receiving requests |

### Route Options

Each of the supported HTTP verbs exposes a set available paths and query parameters.

#### GET

The path parameter in a GET request specifies the sub-section of the resource to retrieve. Omitting the path parameter (GET /) will query the collection, while it's inclusion will drill down into the document specified. As such, the first segment of the path parameter (when specified) must be the OID of a document in the collection. Take the following simple collection:

```json
[
  {
    "_id": "5ec2d0193fd8c5d9b72948ce",
    "name": "Patricia",
    "isActive": true
  },
  {
    "_id": "5ec2d0193fd8c5d9b72948ce",
    "name": "Stephen",
    "isActive": false
  }
]
```

```sh
# Get all users
curl -X GET /users

# Get a user by ID
curl -X GET /users/5ec2d0193fd8c5d9b72948ce

# Get the isActive state of a known user
curl -X GET /users/5ec2d0193fd8c5d9b72948ce/isActive
```

Alternatively you can query the collection using the `query` query parameter as follows. The query parameter takes JSON and converts it into a MongoDB query which is used to select matching documents.

```sh
# Get users called Stephen
curl -X GET /users?query={"name":"Stephen"}
```

Goose express also supports projections on the collection level results via the `fields` query parameter. The fields parameter is a JSON array of field inclusions or exclusions, when fields prefixed with a `-` are removed from the output. **N.B You cannot mix inclusions and exclusions in the same query.**

```sh
# Get the name field for every user
curl -X GET /users?fields=["name"]

# Get every user but don't return the _id or name fields
curl -X GET /users?fields=["-_id, -name"]
```

**Coming Soon**

- Projections on nested queries

#### POST

The POST method allows creation of new documents as well as addition of sub-documents into nested arrays. Specifically, when a path is not provided `POST /` the request body is treated as the new document to create. When the path specifies a key on the document which represents an array of sub-documents, the request body is treated as a new sub-document to push to that Array. **N.B the post method does not first check if such a sub-document already exists before creation**

Returning once again to our simple user collection:

```sh
# Create a new user (Response will be the new document)
curl -X POST /users -d '{"name": "Alex", "isActive": false, "phoneNumbers: []"}' -H "content-type: application/json"

# Create a new phone number for a given user (Response will be the updated document)
curl -X POST /users/{userID}/phoneNumbers -d '{"isPrimary": true, "number": "07225367328"}' -H "content-type: application/json"
```

#### PUT

The PUT method allows update of an existing document, creation of a document, and update of nested sub-documents. In contrast to POST requests, a PUT request must specify the _location_ to insert the information provided. In our case this means specifying a Mongo ID. The upshot of this is that PUT requests are `Idempotent`, meaning that if you issue the same PUT command multiple times the result will be the same.

```json
[
  {
    "_id": "000000000000000000000001",
    "name": "Patricia",
    "phoneNumbers": [{
      "_id": "000000000000000000000004"
      "isPrimary": true,
      "number": "08772366432"
    }],
    "isActive": true
  },
  {
    "_id": "000000000000000000000002",
    "name": "Stephen",
    "phoneNumbers": [],
    "isActive": false
  }
]
```

**N.B the PUT verb will completely overwrite the specified record. If you only wish to update a specific section use PATCH**

```sh
# Update an existing user (Response will be 201 Updated)
curl -X PUT /users/000000000000000000000001 -d '{"name": "Alex", "isActive": false, "phoneNumbers: []"}' -H "content-type: application/json"

# Create a new user (Upsert so response will be 200 Created)
curl -X PUT /users/000000000000000000000003 -d '{"name": "Jane", "isActive": false, "phoneNumbers: []"}' -H "content-type: application/json"

# Update a phone number for a given user (Response will be the updated document)
curl -X PUT /users/000000000000000000000001/phoneNumbers/{phoneNumberId} -d '{"isPrimary": true, "number": "07211392328"}' -H "content-type: application/json"

# Create a phone number at a specified ID for a given user (Response will be the updated document)
curl -X PUT /users/000000000000000000000001/phoneNumbers/000000000000000000000005 -d '{"isPrimary": false, "number": "07210865328"}' -H "content-type: application/json"
```

#### DELETE

The DELETE method can delete either a specified document, a specified sub-document from a nested schema, or a set of documents matching a Mongo query.

```sh
# Delete a phone number for a user by ID
curl -X DELETE /users/000000000000000000000001/phoneNumbers/000000000000000000000004

# Delete a user by ID
curl -X DELETE /users/000000000000000000000001

# Delete all users who have are not active
curl -X DELETE /users?query={"isActive": false}
```

#### PATCH

The PATCH method allows update of the full document, as well as targeted update to embedded fields. When targetting an individual field you must wrap your request in an 'update' to ensure it is valid JSON. When updating a specified document (path ends in an OID) you should specify the intended updates as the request body.

```sh
# Update a document
curl -X PATCH /users/000000000000000000000001 -d '{"isActive": true}' -H "content-type: application/json"

# This could also be achived by targetting the isActive attribute
curl -X PATCH /users/000000000000000000000001/isActive -d '{"update": true}' -H "content-type: application/json"

# Update a nested phoneNumber
curl -X PATCH /users/000000000000000000000001/phoneNumbers/000000000000000000000004 -d '{"isPrimary": true}' -H "content-type: application/json"

# Or by specifying the field
curl -X PATCH /users/000000000000000000000001/phoneNumbers/000000000000000000000004/isPrimary -d '{"update": true}' -H "content-type: application/json"
```

## Custom Router Config

If you do not wish to expose the complete set of these routes, or need to implement different access control for GET vs POST, you can do so by using the individual router functions exposed on the GooseExpress object.

```js
import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json()); // <--- You'll need to parse JSON payloads

app.get("/users/*", userController.get()); // <--- The /* is required to ensure subpaths match

app.use(someAuthenticationMiddleware); // <---- Ensure that update requests are authentiated

app.post("/users/*", userController.post());
app.put("/users/*", userController.put());
app.patch("/users/*", userController.patch());
// app.delete("/users/*", userController.delete()); <---- Disable delete routes by ommiting this handler
```
