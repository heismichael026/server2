import ProductModel, { IProduct } from './product.model';
import { ListProductsQuery } from './product.validation';

class ProductService {
  async list(query: ListProductsQuery): Promise<{ items: IProduct[]; total: number; page: number; limit: number; totalPages: number }> {
    const filter: Record<string, unknown> = {};
    if (query.category) filter.category = query.category;
    if (query.available !== undefined) filter.available = query.available === 'true';
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      ProductModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
      ProductModel.countDocuments(filter),
    ]);

    return {
      items: items as unknown as IProduct[],
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 0,
    };
  }

  async listCategories(): Promise<string[]> {
    const categories = await ProductModel.distinct('category');
    return categories.filter(Boolean) as string[];
  }

  async findById(id: string): Promise<IProduct | null> {
    return ProductModel.findById(id).lean() as unknown as Promise<IProduct | null>;
  }

  async findByIds(ids: string[]): Promise<IProduct[]> {
    return ProductModel.find({ _id: { $in: ids } }).lean() as unknown as Promise<IProduct[]>;
  }
}

export default new ProductService();
