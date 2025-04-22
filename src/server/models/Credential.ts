import { Schema, model, models } from 'mongoose';

const credentialSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  login: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  }
}, {
  timestamps: true,
});

export const Credential = models.Credential || model('Credential', credentialSchema); 