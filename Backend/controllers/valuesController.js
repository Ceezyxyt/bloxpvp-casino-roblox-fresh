const asyncHandler = require("express-async-handler");
const Item = require("../models/item");

exports.get_adopt_me_values = asyncHandler(async (req, res) => {
  const search = String(req.query.search || "").trim();
  const query = { game: "pets" };
  if (search) query.display_name = { $regex: search, $options: "i" };

  const items = await Item.find(query, {
    _id: 1,
    item_name: 1,
    display_name: 1,
    item_value: 1,
    item_image: 1,
    game: 1,
  })
    .sort({ display_name: 1 })
    .limit(2500)
    .lean();

  res.status(200).json({
    success: true,
    game: "Adopt Me",
    count: items.length,
    items,
  });
});