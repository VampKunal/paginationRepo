import { useState, useEffect } from "react"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./components/ui/card"
import { Input } from "./components/ui/input"
import { Label } from "./components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog"

const API_URL = "http://localhost:5000/products"
const CATEGORIES = ["Electronics", "Books", "Clothing", "Sports", "Home"]

export default function App() {
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState("")
  const [cursor, setCursor] = useState(null)
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: "", category: "", price: "" })

  const fetchProducts = async (currentCursor = null, reset = false) => {
    try {
      setLoading(true)
      let url = new URL(API_URL)
      if (category && category !== "All") url.searchParams.append("category", category)
      if (currentCursor) url.searchParams.append("cursor", currentCursor)

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      
      if (reset) {
        setProducts(data.products)
      } else {
        setProducts((prev) => [...prev, ...data.products])
      }
      
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts(null, true)
  }, [category])

  const handleLoadMore = () => {
    if (nextCursor) fetchProducts(nextCursor)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = editingId ? `${API_URL}/${editingId}` : API_URL
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error("Failed to save")
      
      setIsOpen(false)
      setFormData({ name: "", category: "", price: "" })
      setEditingId(null)
      fetchProducts(null, true)
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete product?")) return
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setProducts(products.filter((p) => p.id !== id))
    } catch (error) {
      console.error(error)
    }
  }

  const openEdit = (product) => {
    setFormData({ name: product.name, category: product.category, price: product.price })
    setEditingId(product.id)
    setIsOpen(true)
  }

  const openCreate = () => {
    setFormData({ name: "", category: "", price: "" })
    setEditingId(null)
    setIsOpen(true)
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex gap-4">
          <Select value={category || "All"} onValueChange={(v) => setCategory(v === "All" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>Add Product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Product" : "New Product"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select required value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">{editingId ? "Update" : "Create"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${product.price}</div>
              <div className="text-muted-foreground">{product.category}</div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => openEdit(product)}>Edit</Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>Delete</Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {!loading && products.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">No products found.</div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button onClick={handleLoadMore} disabled={loading}>
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  )
}
