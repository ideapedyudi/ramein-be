import Category from "../../models/Category.js";
import City from "../../models/City.js";
import Venue from "../../models/Venue.js";
import Organizer from "../../models/Organizer.js";
import ApiError from "../../utils/apiError.js";

const modelMap = {
  categories: Category,
  cities: City,
  venues: Venue,
  organizers: Organizer
};

function getModel(resource) {
  const model = modelMap[resource];
  if (!model) throw new ApiError(400, "Invalid master data resource");
  return model;
}

async function list(resource) {
  const model = getModel(resource);
  return model.find();
}

async function create(resource, payload) {
  const model = getModel(resource);
  return model.create(payload);
}

async function update(resource, id, payload) {
  const model = getModel(resource);
  const doc = await model.findByIdAndUpdate(id, payload, { new: true });
  if (!doc) throw new ApiError(404, "Data not found");
  return doc;
}

async function remove(resource, id) {
  const model = getModel(resource);
  const doc = await model.findById(id);
  if (!doc) throw new ApiError(404, "Data not found");
  doc.isActive = false;
  await doc.save();
  return doc;
}

export default {
  list,
  create,
  update,
  remove
};
