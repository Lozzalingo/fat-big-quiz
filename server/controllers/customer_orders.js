const prisma = require("../utils/prisma");

async function createCustomerOrder(request, response) {
  try {
    const {
      name, lastname, phone, email, company, address, apartment,
      postalCode, status, city, country, orderNotice, total,
    } = request.body;

    console.log("[Order] Creating customer order for:", email);

    const corder = await prisma.customer_order.create({
      data: {
        name, lastname, phone, email, company, address, apartment,
        postalCode, status, city, country, orderNotice, total,
      },
    });

    console.log("[Order] Created:", corder.id);
    return response.status(201).json(corder);
  } catch (error) {
    console.error("[Order] Error creating:", error.message);
    return response.status(500).json({ error: "Error creating order" });
  }
}

async function updateCustomerOrder(request, response) {
  try {
    const { id } = request.params;
    const {
      name,
      lastname,
      phone,
      email,
      company,
      address,
      apartment,
      postalCode,
      dateTime,
      status,
      city,
      country,
      orderNotice,
      total,
    } = request.body;

    console.log("[Order] Updating order:", id);

    const existingOrder = await prisma.customer_order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      console.log("[Order] Not found for update:", id);
      return response.status(404).json({ error: "Order not found" });
    }

    const updatedOrder = await prisma.customer_order.update({
      where: {
        id: existingOrder.id,
      },
      data: {
        name,
        lastname,
        phone,
        email,
        company,
        address,
        apartment,
        postalCode,
        dateTime,
        status,
        city,
        country,
        orderNotice,
        total,
      },
    });

    console.log("[Order] Updated:", id);
    return response.status(200).json(updatedOrder);
  } catch (error) {
    console.error("[Order] Error updating:", error.message);
    return response.status(500).json({ error: "Error updating order" });
  }
}

async function deleteCustomerOrder(request, response) {
  try {
    const { id } = request.params;
    console.log("[Order] Deleting:", id);
    await prisma.customer_order.delete({ where: { id } });
    console.log("[Order] Deleted:", id);
    return response.status(204).send();
  } catch (error) {
    console.error("[Order] Error deleting:", error.message);
    return response.status(500).json({ error: "Error deleting order" });
  }
}

async function getCustomerOrder(request, response) {
  try {
    const { id } = request.params;
    console.log("[Order] Fetching:", id);
    const order = await prisma.customer_order.findUnique({ where: { id } });
    if (!order) {
      console.log("[Order] Not found:", id);
      return response.status(404).json({ error: "Order not found" });
    }
    return response.status(200).json(order);
  } catch (error) {
    console.error("[Order] Error fetching:", error.message);
    return response.status(500).json({ error: "Error fetching order" });
  }
}

async function getAllOrders(request, response) {
  try {
    console.log("[Order] Fetching all orders");
    const orders = await prisma.customer_order.findMany({
      orderBy: { dateTime: 'desc' }
    });
    console.log(`[Order] Found ${orders.length} orders`);
    return response.json(orders);
  } catch (error) {
    console.error("[Order] Error fetching all:", error.message);
    return response.status(500).json({ error: "Error fetching orders" });
  }
}

module.exports = {
  createCustomerOrder,
  updateCustomerOrder,
  deleteCustomerOrder,
  getCustomerOrder,
  getAllOrders,
};
