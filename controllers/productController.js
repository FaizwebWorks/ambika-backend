// class ProductController {
//   async getAllProducts(req, res) {
//     try {
//       const products = await Product.find();
//       res.status(200).json(products);
//     } catch (error) {
//       res.status(500).json({ message: "Error retrieving products" });
//     }
//   }

//   async getProductById(req, res) {
//     const { id } = req.params;
//     try {
//       const product = await Product.findById(id);
//       if (!product) {
//         return res.status(404).json({ message: "Product not found" });
//       }
//       res.status(200).json(product);
//     } catch (error) {
//       res.status(500).json({ message: "Error retrieving product" });
//     }
//   }

//   async createProduct(req, res) {
//     const newProduct = new Product(req.body);
//     try {
//       const savedProduct = await newProduct.save();
//       res.status(201).json(savedProduct);
//     } catch (error) {
//       res.status(400).json({ message: "Error creating product" });
//     }
//   }

//   async updateProduct(req, res) {
//     const { id } = req.params;
//     try {
//       const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });
//       if (!updatedProduct) {
//         return res.status(404).json({ message: "Product not found" });
//       }
//       res.status(200).json(updatedProduct);
//     } catch (error) {
//       res.status(400).json({ message: "Error updating product" });
//     }
//   }

//   async deleteProduct(req, res) {
//     const { id } = req.params;
//     try {
//       const deletedProduct = await Product.findByIdAndDelete(id);
//       if (!deletedProduct) {
//         return res.status(404).json({ message: "Product not found" });
//       }
//       res.status(200).json({ message: "Product deleted successfully" });
//     } catch (error) {
//       res.status(500).json({ message: "Error deleting product" });
//     }
//   }
// }

// module.exports = new ProductController();