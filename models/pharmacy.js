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

export default Pharmacy;
