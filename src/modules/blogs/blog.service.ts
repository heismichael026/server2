import BlogModel, { IBlog } from './blog.model';
import { ListBlogsQuery } from './blog.validation';

class BlogService {
  async listPublished(query: ListBlogsQuery): Promise<{ items: IBlog[]; total: number; page: number; limit: number; totalPages: number }> {
    const filter = { published: true };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      BlogModel.find(filter).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(query.limit).lean(),
      BlogModel.countDocuments(filter),
    ]);

    return {
      items: items as unknown as IBlog[],
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 0,
    };
  }

  async getBySlug(slug: string): Promise<IBlog | null> {
    return BlogModel.findOne({ slug, published: true }).lean() as unknown as Promise<IBlog | null>;
  }
}

export default new BlogService();
