import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IOrderBillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IOrderLineItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  amount_total: number;
  image?: string;
  description?: string | null;
  size?: string | null;
  color?: string | null;
  productDescription?: string | null;
}

export interface IOrder extends Document {
  id: string;
  stripe_session_id: string;
  customer_email: string;
  amount_total_cents?: number;
  amount_total?: number;
  amount_subtotal?: number;
  shipping_amount?: number;
  currency: string;
  payment_status: string;
  shipping_address: IOrderShippingAddress;
  billing_address?: IOrderBillingAddress;
  billing_same_as_shipping?: boolean;
  line_items: IOrderLineItem[];
  created_at: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderShippingAddressSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    line1: { type: String, required: true },
    line2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const OrderBillingAddressSchema = new Schema(
  {
    line1: { type: String, required: true },
    line2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const OrderLineItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    amount_total: { type: Number, required: true },
    image: { type: String },
    description: { type: String },
    size: { type: String },
    color: { type: String },
    productDescription: { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    id: { type: String, required: true, unique: true },
    stripe_session_id: { type: String, required: true },
    customer_email: { type: String, required: true },
    amount_total_cents: { type: Number },
    amount_total: { type: Number },
    amount_subtotal: { type: Number },
    shipping_amount: { type: Number },
    currency: { type: String, required: true, default: 'usd' },
    payment_status: { type: String, required: true },
    shipping_address: { type: OrderShippingAddressSchema, required: true },
    billing_address: { type: OrderBillingAddressSchema },
    billing_same_as_shipping: { type: Boolean },
    line_items: { type: [OrderLineItemSchema], required: true, default: [] },
    created_at: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

OrderSchema.index({ id: 1 });
OrderSchema.index({ customer_email: 1 });
OrderSchema.index({ created_at: -1 });
OrderSchema.index({ payment_status: 1 });

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
