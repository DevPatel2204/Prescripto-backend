// routes/api/pharmacies.js
import express from 'express';
// models/Pharmacy.js

import mongoose from "mongoose";

const Schema = mongoose.Schema;

const addressSchema = new Schema(
  {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true }, // Or use an enum for specific states/provinces
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: "USA", trim: true }, // Default if applicable
    coordinates: {
      // Optional: For mapping/distance features
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  { _id: false }
); // _id: false prevents Mongoose from creating an _id for the subdocument

const openingHoursSchema = new Schema(
  {
    dayOfWeek: {
      // e.g., 0 for Sunday, 1 for Monday, ..., 6 for Saturday
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    openTime: {
      // e.g., "09:00" (24-hour format recommended for easier sorting/comparison)
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/, // Basic HH:MM format validation
    },
    closeTime: {
      // e.g., "18:00"
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
  },
  { _id: false }
);

const pharmacySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Pharmacy name is required"],
      trim: true,
      index: true, // Index for faster searching by name
    },
    address: {
      type: addressSchema,
      required: [true, "Pharmacy address is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      // Consider adding more specific validation/formatting if needed
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "is invalid"], // Simple email format validation
      // unique: true, // Uncomment if email must be unique across all pharmacies
    },
    website: {
      type: String,
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, "Pharmacy license number is required"],
      unique: true, // Ensures license numbers are unique
      trim: true,
      index: true,
    },
    servicesOffered: [
      {
        // List of services like 'Prescriptions', 'Vaccinations', 'OTC Sales', 'Compounding'
        type: String,
        trim: true,
      },
    ],
    openingHours: [openingHoursSchema], // Array to hold hours for different days
    isActive: {
      // To easily deactivate a pharmacy listing without deleting
      type: Boolean,
      default: true,
    },
    // Consider adding relationships later if needed:
    // pharmacistInCharge: { type: Schema.Types.ObjectId, ref: 'User' }, // Example if you have a User model
    // inventory: [{ type: Schema.Types.ObjectId, ref: 'Drug' }] // Example if you have a Drug/Inventory model
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Optional: Add index for geospatial queries if using coordinates
// pharmacySchema.index({ 'address.coordinates': '2dsphere' });

// Optional: Pre-save hook for validation or data manipulation
// pharmacySchema.pre('save', function(next) {
//   // Example: Ensure state is uppercase
//   if (this.address && this.address.state) {
//     this.address.state = this.address.state.toUpperCase();
//   }
//   next();
// });

const Pharmacy = mongoose.model("Pharmacy", pharmacySchema);


const router = express.Router();
// const pharmacyController = require('../../controllers/pharmacyController'); // If using controllers

// --- Basic CRUD Examples ---

// @route   POST api/pharmacies
// @desc    Create a new pharmacy
// @access  Private (example: requires authentication/authorization)
router.post('/', async (req, res) => {
  try {
    // **IMPORTANT**: Add input validation here (e.g., using express-validator or Joi)
    // Ensure req.body contains all required fields and they are in the correct format

    const newPharmacy = new Pharmacy({
      name: req.body.name,
      address: req.body.address, // Assuming address is an object { street, city, ... }
      phoneNumber: req.body.phoneNumber,
      licenseNumber: req.body.licenseNumber,
      email: req.body.email,
      website: req.body.website,
      servicesOffered: req.body.servicesOffered, // Assuming an array of strings
      openingHours: req.body.openingHours, // Assuming an array of { dayOfWeek, openTime, closeTime }
      // Add other fields from req.body
    });

    const pharmacy = await newPharmacy.save();
    res.status(201).json(pharmacy); // 201 Created

  } catch (err) {
    console.error("Error creating pharmacy:", err.message);
    if (err.code === 11000) { // Handle duplicate key error (e.g., licenseNumber)
        return res.status(400).json({ msg: 'Pharmacy with this license number already exists.' });
    }
    if (err.name === 'ValidationError') {
         return res.status(400).json({ msg: 'Validation Error', errors: err.errors });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/pharmacies
// @desc    Get all active pharmacies (add query params for filtering/pagination)
// @access  Public or Private
router.get('/', async (req, res) => {
  try {
    // Add filtering based on query params (e.g., ?city=..., ?service=...)
    const filter = { isActive: true }; // Default to only active ones
    if (req.query.city) {
        filter['address.city'] = new RegExp(req.query.city, 'i'); // Case-insensitive search
    }
     if (req.query.service) {
        filter.servicesOffered = { $in: [new RegExp(req.query.service, 'i')] };
    }
    // Add pagination: ?limit=10&skip=0

    const pharmacies = await Pharmacy.find(filter).sort({ name: 1 }); // Sort by name
    res.json(pharmacies);

  } catch (err) {
    console.error("Error fetching pharmacies:", err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/pharmacies/:id
// @desc    Get a specific pharmacy by ID
// @access  Public or Private
router.get('/:id', async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findById(req.params.id);

    if (!pharmacy || !pharmacy.isActive) { // Check if found and active
      return res.status(404).json({ msg: 'Pharmacy not found' });
    }

    res.json(pharmacy);

  } catch (err) {
    console.error("Error fetching pharmacy by ID:", err.message);
    if (err.kind === 'ObjectId') {
         return res.status(404).json({ msg: 'Pharmacy not found (Invalid ID format)' });
    }
    res.status(500).send('Server Error');
  }
});


// @route   PUT api/pharmacies/:id
// @desc    Update a pharmacy
// @access  Private
router.put('/:id', async (req, res) => {
    try {
        // **IMPORTANT**: Add input validation here

        const pharmacy = await Pharmacy.findById(req.params.id);
        if (!pharmacy) {
            return res.status(404).json({ msg: 'Pharmacy not found' });
        }

        // Update fields selectively (avoids accidentally clearing fields not sent)
        const updateData = { ...req.body };

        // Prevent changing license number easily, or handle uniqueness check if allowed
        // delete updateData.licenseNumber;

        const updatedPharmacy = await Pharmacy.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true } // new: return updated doc, runValidators: ensure updates adhere to schema
        );

        res.json(updatedPharmacy);

    } catch (err) {
        console.error("Error updating pharmacy:", err.message);
         if (err.code === 11000) {
            return res.status(400).json({ msg: 'Update failed: Duplicate key violation (e.g., license number).' });
        }
        if (err.name === 'ValidationError') {
             return res.status(400).json({ msg: 'Validation Error', errors: err.errors });
        }
         if (err.kind === 'ObjectId') {
             return res.status(404).json({ msg: 'Pharmacy not found (Invalid ID format)' });
        }
        res.status(500).send('Server Error');
    }
});


// @route   DELETE api/pharmacies/:id
// @desc    Delete a pharmacy (or mark as inactive)
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const pharmacy = await Pharmacy.findById(req.params.id);
        if (!pharmacy) {
            return res.status(404).json({ msg: 'Pharmacy not found' });
        }

        // Option 1: Soft delete (recommended)
        pharmacy.isActive = false;
        await pharmacy.save();
        res.json({ msg: 'Pharmacy marked as inactive' });

        // Option 2: Hard delete (permanent)
        // await Pharmacy.findByIdAndDelete(req.params.id);
        // res.json({ msg: 'Pharmacy removed' });

    } catch (err) {
        console.error("Error deleting pharmacy:", err.message);
         if (err.kind === 'ObjectId') {
             return res.status(404).json({ msg: 'Pharmacy not found (Invalid ID format)' });
        }
        res.status(500).send('Server Error');
    }
});


export default router;