import asyncHandler from "../../utils/asyncHandler.js";
import { successResponse  } from "../../utils/response.js";
import service from "./masterData.service.js";

const list = asyncHandler(async (req, res) => {
  const data = await service.list(req.params.resource);
  return successResponse(res, 200, "Master data list", data);
});

const detail = asyncHandler(async (req, res) => {
  const data = await service.detail(req.params.resource, req.params.id);
  return successResponse(res, 200, "Master data detail", data);
});

const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.params.resource, req.body);
  return successResponse(res, 201, "Master data created", data);
});

const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.resource, req.params.id, req.body);
  return successResponse(res, 200, "Master data updated", data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await service.remove(req.params.resource, req.params.id);
  return successResponse(res, 200, "Master data deactivated", data);
});

export default {
  list,
  detail,
  create,
  update,
  remove
};
