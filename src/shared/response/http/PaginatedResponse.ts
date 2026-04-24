export default class PaginatedResponse<T> {
   public static Paging = class {
      public page: number
      public limit: number
      public total_results: number
      public max_page: number

      constructor({ page, limit, total_results, max_page }: Paging) {
         this.page = page
         this.limit = limit
         this.total_results = total_results
         this.max_page = max_page
      }
   }

   public paging: Paging
   public data: T[]

   constructor(data: T[], paging: Paging) {
      this.data = data
      this.paging = paging
   }
}

export class Paging {
   public page: number
   public limit: number
   public total_results: number
   public max_page: number

   constructor({ page, limit, total_results, max_page }: Paging) {
      this.page = page
      this.limit = limit
      this.total_results = total_results
      this.max_page = max_page
   }
}  
