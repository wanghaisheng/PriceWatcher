import {NextResponse} from "next/server";
import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose"
import { scrapeAmazonProduct } from "@/lib/scrapper";
import { getAveragePrice, getEmailNotifType, getHighestPrice, getLowestPrice } from "@/lib/utils";
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";

export const maxDuration = 10; // This function can run for a maximum of 300 seconds in pro version of vercel but free version is hobby 
//version which has 10 sec max.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request){
    try {
        connectToDB();

        const products = await Product.find({});

        if(!products) throw new Error ("No products found");

        //1. Scrape latest product details and update DB
        const updatedProducts = await Promise.all(
            products.map(async (currentProduct) => {
                const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

                if(!scrapedProduct) return;

                const updatedPriceHistory =  [...currentProduct.priceHistory, {price : scrapedProduct.currentPrice,},];

            const product = {
                ...scrapedProduct, 
                priceHistory : updatedPriceHistory,
                lowestPrice : getLowestPrice(updatedPriceHistory),
                highestPrice : getHighestPrice(updatedPriceHistory),
                averagePrice : getAveragePrice(updatedPriceHistory)
            }
        

            const updatedProduct = await Product.findOneAndUpdate(
                { url : product.url, },
                product,
            );


            //2. Check each product status and send email accordingly
            const emailNotifType = getEmailNotifType(scrapedProduct, currentProduct);


            if (emailNotifType && updatedProduct.users.length > 0) {
                const productInfo = {
                  title: updatedProduct.title,
                  url: updatedProduct.url,
                };
                // Construct emailContent
                const emailContent = await generateEmailBody(productInfo, emailNotifType);
                // Get array of user emails
                const userEmails = updatedProduct.users.map((user: any) => user.email);
                // Send email notification
                await sendEmail(emailContent, userEmails);
              }

              return updatedProduct;

                })
            );

            return NextResponse.json({
                message: "Ok",
                data: updatedProducts,
              });
        
    } catch (error: any) {
        throw new Error (`Failed to get all products: ${error.message}`)
    }
}