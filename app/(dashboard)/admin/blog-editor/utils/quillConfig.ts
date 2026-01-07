"use client";
import toast from "react-hot-toast";
import Quill from "quill";
import "react-quill/dist/quill.snow.css";

// Import Parchment for custom attributors and blots
const Parchment = Quill.import("parchment");

// Custom Image Size Attributor
class ImageSizeAttributor extends Parchment.Attributor.Attribute {
  static keyName = "data-size";

  constructor() {
    super("imageSize", "data-size", { scope: Parchment.Scope.BLOCK });
  }

  add(node: HTMLElement, value: string) {
    if (!node) return false;
    node.setAttribute(this.keyName, value);
    switch (value) {
      case "small":
        node.style.width = "25%";
        break;
      case "medium":
        node.style.width = "50%";
        break;
      case "large":
        node.style.width = "75%";
        break;
      case "huge":
        node.style.width = "100%";
        break;
      default:
        node.style.width = "auto";
    }
    return true;
  }

  remove(node: HTMLElement) {
    node.removeAttribute(this.keyName);
    node.style.removeProperty("width");
  }

  value(node: HTMLElement) {
    return node.getAttribute(this.keyName) || "";
  }
}

const ImageSize = new ImageSizeAttributor();
Quill.register(ImageSize, true);

// Custom Image Alignment Attributor
class ImageAlignAttributor extends Parchment.Attributor.Style {
  static keyName = "align";

  constructor() {
    super("imageAlign", "float", { scope: Parchment.Scope.INLINE });
  }

  add(node: HTMLElement, value: string) {
    if (!node) return false;
    if (value === "left" || value === "right") {
      node.style.float = value;
      node.style.margin = "0 1em 1em 0"; // Adjust margin for floated images
      node.style.display = "inline-block"; // Ensure floated images behave correctly
    } else if (value === "center" || value === "") {
      node.style.float = "none";
      node.style.display = "block";
      node.style.margin = "0 auto"; // Center images
    }
    return true;
  }

  remove(node: HTMLElement) {
    node.style.removeProperty("float");
    node.style.removeProperty("margin");
    node.style.removeProperty("display");
  }

  value(node: HTMLElement) {
  return node.style.float || (node.style.display === "block" && node.style.margin === "0 auto" ? "center" : "");
}
}

const ImageAlign = new ImageAlignAttributor();
Quill.register(ImageAlign, true);

// Custom Image Blot
const BlockEmbed = Quill.import("blots/block/embed");
class CustomImage extends BlockEmbed {
  static blotName = "image";
  static tagName = "img";

  static create(value: { src: string; size?: string; align?: string }) {
    const node = super.create();
    node.setAttribute("src", value.src);
    if (value.size) {
      ImageSize.add(node, value.size);
    }
    if (value.align) {
      ImageAlign.add(node, value.align);
    }
    return node;
  }

  static value(node: HTMLElement) {
    return {
      src: node.getAttribute("src"),
      size: node.getAttribute("data-size") || "",
      align: ImageAlign.value(node) || "",
    };
  }
}
Quill.register(CustomImage, true);

// Quill Modules Configuration
export const quillModules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "sub" }, { script: "super" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ direction: "rtl" }],
      [{ color: [] }, { background: [] }],
      [{ align: ["", "center", "right", "justify",] }],
      ["blockquote", "code-block"],
      ["link", "image", "video"],
      [{ imageSize: ["small", "medium", "large", "huge"] }],
      ["clean"],
    ],
    handlers: {
      image: function (this: any) {
        // Same as original image handler
        const modal = document.createElement("div");
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        modal.style.zIndex = "9999";
        modal.style.display = "flex";
        modal.style.justifyContent = "center";
        modal.style.alignItems = "center";

        const modalContent = document.createElement("div");
        modalContent.style.backgroundColor = "white";
        modalContent.style.padding = "2rem";
        modalContent.style.borderRadius = "0.5rem";
        modalContent.style.width = "500px";
        modalContent.style.maxWidth = "90%";
        modalContent.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";

        const title = document.createElement("h3");
        title.textContent = "Insert Image";
        title.style.marginBottom = "1rem";
        title.style.fontSize = "1.25rem";
        title.style.fontWeight = "600";

        const options = document.createElement("div");
        options.style.display = "flex";
        options.style.flexDirection = "column";
        options.style.gap = "1rem";

        const uploadOption = document.createElement("button");
        uploadOption.textContent = "Upload new image";
        uploadOption.style.padding = "0.75rem";
        uploadOption.style.borderRadius = "0.375rem";
        uploadOption.style.backgroundColor = "#2563eb";
        uploadOption.style.color = "white";
        uploadOption.style.fontWeight = "500";
        uploadOption.style.cursor = "pointer";
        uploadOption.style.border = "none";
        uploadOption.style.display = "flex";
        uploadOption.style.alignItems = "center";
        uploadOption.style.justifyContent = "center";
        uploadOption.style.gap = "0.5rem";

        const blogBodyOption = document.createElement("button");
        blogBodyOption.textContent = "Select from blog-body folder";
        blogBodyOption.style.padding = "0.75rem";
        blogBodyOption.style.borderRadius = "0.375rem";
        blogBodyOption.style.backgroundColor = "#e5e7eb";
        blogBodyOption.style.color = "#374151";
        blogBodyOption.style.fontWeight = "500";
        blogBodyOption.style.cursor = "pointer";
        blogBodyOption.style.border = "none";
        blogBodyOption.style.display = "flex";
        blogBodyOption.style.alignItems = "center";
        blogBodyOption.style.justifyContent = "center";
        blogBodyOption.style.gap = "0.5rem";

        const productsOption = document.createElement("button");
        productsOption.textContent = "Select from products folder";
        productsOption.style.padding = "0.75rem";
        productsOption.style.borderRadius = "0.375rem";
        productsOption.style.backgroundColor = "#e5e7eb";
        productsOption.style.color = "#374151";
        productsOption.style.fontWeight = "500";
        productsOption.style.cursor = "pointer";
        productsOption.style.border = "none";
        productsOption.style.display = "flex";
        productsOption.style.alignItems = "center";
        productsOption.style.justifyContent = "center";
        productsOption.style.gap = "0.5rem";

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.style.padding = "0.75rem";
        cancelButton.style.borderRadius = "0.375rem";
        cancelButton.style.backgroundColor = "#f3f4f6";
        cancelButton.style.color = "#374151";
        cancelButton.style.fontWeight = "500";
        cancelButton.style.cursor = "pointer";
        cancelButton.style.border = "none";
        cancelButton.style.marginTop = "1rem";

        options.appendChild(uploadOption);
        options.appendChild(blogBodyOption);
        options.appendChild(productsOption);

        modalContent.appendChild(title);
        modalContent.appendChild(options);
        modalContent.appendChild(cancelButton);

        modal.appendChild(modalContent);

        document.body.appendChild(modal);

        const closeModal = () => {
          document.body.removeChild(modal);
        };

        cancelButton.addEventListener("click", closeModal);

        uploadOption.addEventListener("click", () => {
          closeModal();

          const input = document.createElement("input");
          input.setAttribute("type", "file");
          input.setAttribute("accept", "image/*");
          input.click();

          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            try {
              const formData = new FormData();
              formData.append("uploadedFile", file);
              formData.append("folderName", "blog/content");

              const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/backendimages`, {
                method: "POST",
                body: formData,
              });

              if (!response.ok) {
                throw new Error("Image upload failed");
              }

              const data = await response.json();
              // Use the CDN URL returned from the API
              const imageUrl = data.cdnUrl;

              const quill = this.quill;
              if (!quill) return;
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, "image", { src: imageUrl });
              quill.setSelection(range.index + 1);

              toast.success("Image uploaded");
            } catch (error) {
              toast.error("Failed to upload image");
            }
          };
        });

        blogBodyOption.addEventListener("click", async () => {
          closeModal();
          try {
            await showImageSelector("blog-body", this);
          } catch (error) {
            toast.error("Failed to load images");
          }
        });

        productsOption.addEventListener("click", async () => {
          closeModal();
          try {
            await showImageSelector("products", this);
          } catch (error) {
            toast.error("Failed to load images");
          }
        });
      },
      link: function (this: any, value: string) {
        // Same as original link handler
        const quill = this.quill;
        if (!quill) {
          toast.error("Editor not initialized");
          return;
        }

        const normalizeUrl = (url: string): string | null => {
          if (!url) return null;
          url = url.trim();
          try {
            if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
              new URL(url);
              return url;
            }
            if (/^www\./i.test(url)) {
              const fullUrl = `https://${url}`;
              new URL(fullUrl);
              return fullUrl;
            }
            if (url.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/)) {
              const fullUrl = `https://${url}`;
              new URL(fullUrl);
              return fullUrl;
            }
            return null;
          } catch (error) {
            return null;
          }
        };

        if (!value || typeof value !== "string") {
          const url = prompt("Enter the URL");
          if (url) {
            const normalizedUrl = normalizeUrl(url);
            if (normalizedUrl) {
              const range = quill.getSelection(true);
              if (!range) {
                toast.error("Please select text or place the cursor to insert a link");
                return;
              }
              if (range.length === 0) {
                quill.insertText(range.index, normalizedUrl);
                quill.formatText(range.index, normalizedUrl.length, "link", normalizedUrl);
              } else {
                quill.format("link", normalizedUrl);
              }
            } else {
              toast.error("Invalid URL");
            }
          }
        } else {
          const normalizedUrl = normalizeUrl(value);
          if (normalizedUrl) {
            const range = quill.getSelection(true);
            if (!range) {
              toast.error("Please select text or place the cursor to insert a link");
              return;
            }
            if (range.length === 0) {
              quill.insertText(range.index, normalizedUrl);
              quill.formatText(range.index, normalizedUrl.length, "link", normalizedUrl);
            } else {
              quill.format("link", normalizedUrl);
            }
          } else {
            quill.format("link", false);
          }
        }
      },
      imageSize: function (this: any, value: string) {
        const quill = this.quill;
        if (!quill) {
          toast.error("Editor not initialized");
          return;
        }

        const range = quill.getSelection();
        if (!range) {
          toast.error("Please select an image");
          return;
        }

        // Get the leaf at the selection
        const [leaf] = quill.getLeaf(range.index);
        if (leaf && leaf.domNode && leaf.domNode.tagName === "IMG") {
          const imageUrl = leaf.domNode.getAttribute("src");
          const index = quill.getIndex(leaf);

          // Update the image with the new size
          quill.deleteText(index, 1);
          quill.insertEmbed(index, "image", { src: imageUrl, size: value });
          quill.setSelection(index + 1);
          toast.success(`Image resized to ${value}`);
          return;
        }

        // If no direct image is selected, check the line
        const [line] = quill.getLine(range.index);
        if (line) {
          const imgNode = line.domNode.querySelector("img");
          if (imgNode) {
            const blot = Quill.find(imgNode);
            if (blot) {
              const index = quill.getIndex(blot);
              const imageUrl = imgNode.getAttribute("src");

              // Update the image with the new size
              quill.deleteText(index, 1);
              quill.insertEmbed(index, "image", { src: imageUrl, size: value });
              quill.setSelection(index + 1);
              toast.success(`Image resized to ${value}`);
              return;
            }
          }
        }
        

        toast.error("Please select an image to resize");
      },
      align: function (this: any, value: string) {
        const quill = this.quill;
        if (!quill) {
          toast.error("Editor not initialized");
          return;
        }

        const range = quill.getSelection();
        if (!range) {
          toast.error("Please select an image or text");
          return;
        }

        // Check if an image is selected
        const [leaf] = quill.getLeaf(range.index);
        if (leaf && leaf.domNode && leaf.domNode.tagName === "IMG") {
          const imageUrl = leaf.domNode.getAttribute("src");
          const size = leaf.domNode.getAttribute("data-size") || "";
          const index = quill.getIndex(leaf);

          // Update the image with the new alignment
          quill.deleteText(index, 1);
          quill.insertEmbed(index, "image", { src: imageUrl, size, align: value });
          quill.setSelection(index + 1);
          toast.success(`Image aligned to ${value || "default"}`);
          return;
        }

        // Apply default Quill alignment to text or blocks
        quill.format("align", value);
      },
    },
  },
};

// Quill Formats
export const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "script",
  "indent",
  "direction",
  "color",
  "background",
  "align",
  "blockquote",
  "code-block",
  "link",
  "image",
  "video",
  "imageSize",
];

// showImageSelector function (unchanged from original)
async function showImageSelector(folderType: "blog-body" | "products", quillContext: any) {
  try {
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modal.style.zIndex = "9999";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";

    const modalContent = document.createElement("div");
    modalContent.style.backgroundColor = "white";
    modalContent.style.padding = "2rem";
    modalContent.style.borderRadius = "0.5rem";
    modalContent.style.width = "800px";
    modalContent.style.maxWidth = "90%";
    modalContent.style.maxHeight = "80vh";
    modalContent.style.overflowY = "auto";
    modalContent.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";

    const title = document.createElement("h3");
    title.textContent = `Select image from ${folderType}`;
    title.style.marginBottom = "1rem";
    title.style.fontSize = "1.25rem";
    title.style.fontWeight = "600";

    const imageGrid = document.createElement("div");
    imageGrid.style.display = "grid";
    imageGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(150px, 1fr))";
    imageGrid.style.gap = "1rem";
    imageGrid.style.marginBottom = "1rem";

    const loadingText = document.createElement("p");
    loadingText.textContent = `Loading images from ${folderType}...`;
    loadingText.style.padding = "2rem";
    loadingText.style.textAlign = "center";
    loadingText.style.gridColumn = "1 / -1";

    imageGrid.appendChild(loadingText);

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.style.padding = "0.75rem";
    cancelButton.style.borderRadius = "0.375rem";
    cancelButton.style.backgroundColor = "#f3f4f6";
    cancelButton.style.color = "#374151";
    cancelButton.style.fontWeight = "500";
    cancelButton.style.cursor = "pointer";
    cancelButton.style.border = "none";
    cancelButton.style.marginTop = "1rem";

    modalContent.appendChild(title);
    modalContent.appendChild(imageGrid);
    modalContent.appendChild(cancelButton);

    modal.appendChild(modalContent);

    document.body.appendChild(modal);

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    cancelButton.addEventListener("click", closeModal);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/list-images?folderName=${folderType}`);

      if (!response.ok) {
        throw new Error("Failed to fetch images");
      }

      const data = await response.json();

      imageGrid.removeChild(loadingText);

      if (data.images.length === 0) {
        const noImagesText = document.createElement("p");
        noImagesText.textContent = `No images found in ${folderType} folder`;
        noImagesText.style.padding = "2rem";
        noImagesText.style.textAlign = "center";
        noImagesText.style.gridColumn = "1 / -1";
        imageGrid.appendChild(noImagesText);
      } else {
        interface ImageData {
          url: string;
          filename: string;
        }

        data.images.forEach((image: ImageData) => {
          const imageContainer = document.createElement("div");
          imageContainer.style.borderRadius = "0.375rem";
          imageContainer.style.overflow = "hidden";
          imageContainer.style.cursor = "pointer";
          imageContainer.style.border = "1px solid #e5e7eb";
          imageContainer.style.aspectRatio = "1";
          imageContainer.style.display = "flex";
          imageContainer.style.justifyContent = "center";
          imageContainer.style.alignItems = "center";
          imageContainer.style.position = "relative";

          const img = document.createElement("img");
          img.src = image.url;
          img.alt = image.filename;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "cover";

          imageContainer.appendChild(img);

          const overlay = document.createElement("div");
          overlay.style.position = "absolute";
          overlay.style.top = "0";
          overlay.style.left = "0";
          overlay.style.width = "100%";
          overlay.style.height = "100%";
          overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
          overlay.style.opacity = "0";
          overlay.style.transition = "opacity 0.2s";
          overlay.style.display = "flex";
          overlay.style.justifyContent = "center";
          overlay.style.alignItems = "center";

          const selectText = document.createElement("span");
          selectText.textContent = "Select";
          selectText.style.color = "white";
          selectText.style.fontWeight = "600";

          overlay.appendChild(selectText);
          imageContainer.appendChild(overlay);

          imageContainer.addEventListener("mouseover", () => {
            overlay.style.opacity = "1";
          });

          imageContainer.addEventListener("mouseout", () => {
            overlay.style.opacity = "0";
          });

          imageContainer.addEventListener("click", () => {
            const quill = quillContext.quill;
            if (!quill) return;
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, "image", { src: image.url });
            quill.setSelection(range.index + 1);

            closeModal();
            toast.success("Image inserted");
          });

          imageGrid.appendChild(imageContainer);
        });
      }
    } catch (error) {
      imageGrid.removeChild(loadingText);

      const errorText = document.createElement("p");
      errorText.textContent = `Error loading images: ${error instanceof Error ? error.message : "Unknown error"}`;
      errorText.style.padding = "2rem";
      errorText.style.textAlign = "center";
      errorText.style.color = "#ef4444";
      errorText.style.gridColumn = "1 / -1";
      imageGrid.appendChild(errorText);
    }
  } catch (error) {
    console.error("Error showing image selector:", error);
    toast.error("Failed to load image selector");
  }
}