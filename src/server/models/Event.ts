import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Reunião', 'Evento', 'Treinamento']
  },
  description: {
    type: String
  },
  userId: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema); 