import type * as prismic from "@prismicio/client";

type Simplify<T> = { [KeyType in keyof T]: T[KeyType] };


type PickContentRelationshipFieldData<
	TRelationship extends prismic.CustomTypeModelFetchCustomTypeLevel1 | prismic.CustomTypeModelFetchCustomTypeLevel2 | prismic.CustomTypeModelFetchGroupLevel1 | prismic.CustomTypeModelFetchGroupLevel2,
	TData extends Record<string, prismic.AnyRegularField | prismic.GroupField | prismic.NestedGroupField | prismic.SliceZone>,
	TLang extends string
> = |
	// Content relationship fields
	{
		[TSubRelationship in Extract<
			TRelationship["fields"][number], prismic.CustomTypeModelFetchContentRelationshipLevel1
		> as TSubRelationship["id"]]:
			ContentRelationshipFieldWithData<TSubRelationship["customtypes"], TLang>;
	} &
	// Group
	{
		[TGroup in Extract<
			TRelationship["fields"][number], prismic.CustomTypeModelFetchGroupLevel1 | prismic.CustomTypeModelFetchGroupLevel2
		> as TGroup["id"]]:
			TData[TGroup["id"]] extends prismic.GroupField<infer TGroupData>
				? prismic.GroupField<PickContentRelationshipFieldData<TGroup, TGroupData, TLang>>
				: never
	} &
	// Other fields
	{
		[TFieldKey in Extract<TRelationship["fields"][number], string>]:
			TFieldKey extends keyof TData ? TData[TFieldKey] : never;
	};

type ContentRelationshipFieldWithData<
	TCustomType extends readonly (prismic.CustomTypeModelFetchCustomTypeLevel1 | string)[] | readonly (prismic.CustomTypeModelFetchCustomTypeLevel2 | string)[],
	TLang extends string = string
> = {
	[ID in Exclude<TCustomType[number], string>["id"]]:
		prismic.ContentRelationshipField<
			ID,
			TLang,
			PickContentRelationshipFieldData<
				Extract<TCustomType[number], { id: ID }>,
				Extract<prismic.Content.AllDocumentTypes, { type: ID }>["data"],
				TLang
			>
		>
}[Exclude<TCustomType[number], string>["id"]];

/**
 * Item in *Artist → Links*
 */
export interface ArtistDocumentDataLinksItem {
	/**
	 * Label field in *Artist → Links*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.links[].label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	label: prismic.KeyTextField;
	
	/**
	 * Link field in *Artist → Links*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.links[].link
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	link: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
}

type ArtistDocumentDataSlicesSlice = RichTextSlice | ImageGallerySlice | QuoteSlice

/**
 * Content for Artist documents
 */
interface ArtistDocumentData {
	/**
	 * Name field in *Artist*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.name
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	name: prismic.KeyTextField;
	
	/**
	 * Photo field in *Artist*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.photo
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	photo: prismic.ImageField<never>;
	
	/**
	 * Discipline field in *Artist*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Hindustani Vocal
	 * - **API ID Path**: artist.discipline
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	discipline: prismic.KeyTextField;
	
	/**
	 * Bio field in *Artist*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.bio
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	bio: prismic.RichTextField;
	
	/**
	 * Links field in *Artist*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.links[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	links: prismic.GroupField<Simplify<ArtistDocumentDataLinksItem>>;/**
	 * Slice Zone field in *Artist*
	 *
	 * - **Field Type**: Slice Zone
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.slices[]
	 * - **Tab**: Body
	 * - **Documentation**: https://prismic.io/docs/slices
	 */
	slices: prismic.SliceZone<ArtistDocumentDataSlicesSlice>;/**
	 * Meta Title field in *Artist*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A title of the page used for social media and search engines
	 * - **API ID Path**: artist.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *Artist*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A brief summary of the page
	 * - **API ID Path**: artist.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
	
	/**
	 * Meta Image field in *Artist*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist.meta_image
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	meta_image: prismic.ImageField<never>;
}

/**
 * Artist document from Prismic
 *
 * - **API ID**: `artist`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type ArtistDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<ArtistDocumentData>, "artist", Lang>;

/**
 * Item in *Event → Artists*
 */
export interface EventDocumentDataArtistsItem {
	/**
	 * Artist field in *Event → Artists*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.artists[].artist
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	artist: prismic.ContentRelationshipField<"artist">;
}

type EventDocumentDataSlicesSlice = RichTextSlice | ImageGallerySlice | QuoteSlice

/**
 * Content for Event documents
 */
interface EventDocumentData {
	/**
	 * Title field in *Event*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.title
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Category field in *Event*
	 *
	 * - **Field Type**: Select
	 * - **Placeholder**: *None*
	 * - **Default Value**: Event
	 * - **API ID Path**: event.category
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/select
	 */
	category: prismic.SelectField<"Event" | "Workshop", "filled">;
	
	/**
	 * Start Date field in *Event*
	 *
	 * - **Field Type**: Date
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.start_date
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/date
	 */
	start_date: prismic.DateField;
	
	/**
	 * End Date field in *Event*
	 *
	 * - **Field Type**: Date
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.end_date
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/date
	 */
	end_date: prismic.DateField;
	
	/**
	 * Date Label field in *Event*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: 7th & 8th November 2002
	 * - **API ID Path**: event.date_label
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	date_label: prismic.KeyTextField;
	
	/**
	 * Description field in *Event*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.description
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	description: prismic.RichTextField;
	
	/**
	 * Hero Image field in *Event*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.hero_image
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	hero_image: prismic.ImageField<never>;
	
	/**
	 * Venue field in *Event*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.venue
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	venue: prismic.KeyTextField;
	
	/**
	 * Artists field in *Event*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.artists[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	artists: prismic.GroupField<Simplify<EventDocumentDataArtistsItem>>;/**
	 * Slice Zone field in *Event*
	 *
	 * - **Field Type**: Slice Zone
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.slices[]
	 * - **Tab**: Body
	 * - **Documentation**: https://prismic.io/docs/slices
	 */
	slices: prismic.SliceZone<EventDocumentDataSlicesSlice>;/**
	 * Meta Title field in *Event*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A title of the page used for social media and search engines
	 * - **API ID Path**: event.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *Event*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A brief summary of the page
	 * - **API ID Path**: event.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
	
	/**
	 * Meta Image field in *Event*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event.meta_image
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	meta_image: prismic.ImageField<never>;
}

/**
 * Event document from Prismic
 *
 * - **API ID**: `event`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type EventDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<EventDocumentData>, "event", Lang>;

type PageDocumentDataSlicesSlice = HeroSlice | SponsorsSlice | AboutSlice | EventListSlice | DonateSlice | ContactSlice | ArtistListSlice | VolunteersSlice | RichTextSlice | ImageGallerySlice | QuoteSlice

/**
 * Content for Page documents
 */
interface PageDocumentData {
	/**
	 * Slice Zone field in *Page*
	 *
	 * - **Field Type**: Slice Zone
	 * - **Placeholder**: *None*
	 * - **API ID Path**: page.slices[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/slices
	 */
	slices: prismic.SliceZone<PageDocumentDataSlicesSlice>;/**
	 * Meta Title field in *Page*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A title of the page used for social media and search engines
	 * - **API ID Path**: page.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *Page*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A brief summary of the page
	 * - **API ID Path**: page.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
	
	/**
	 * Meta Image field in *Page*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: page.meta_image
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	meta_image: prismic.ImageField<never>;
}

/**
 * Page document from Prismic
 *
 * - **API ID**: `page`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type PageDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<PageDocumentData>, "page", Lang>;

/**
 * Item in *Site Settings → Socials*
 */
export interface SettingsDocumentDataSocialsItem {
	/**
	 * YouTube field in *Site Settings → Socials*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.socials[].youtube
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	youtube: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Instagram field in *Site Settings → Socials*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.socials[].instagram
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	instagram: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Facebook field in *Site Settings → Socials*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.socials[].facebook
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	facebook: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
}

/**
 * Item in *Site Settings → Navigation*
 */
export interface SettingsDocumentDataNavItem {
	/**
	 * Links field in *Site Settings → Navigation*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.nav[].links
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	links: prismic.Repeatable<prismic.LinkField<string, string, unknown, prismic.FieldState, never>>;
}

/**
 * Item in *Site Settings → Footer*
 */
export interface SettingsDocumentDataFooterItem {
	/**
	 * Contact Details field in *Site Settings → Footer*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.footer[].contact
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	contact: prismic.KeyTextField;
	
	/**
	 * Address field in *Site Settings → Footer*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.footer[].address
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	address: prismic.KeyTextField;
	
	/**
	 * Copyright field in *Site Settings → Footer*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.footer[].copyright
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	copyright: prismic.KeyTextField;
	
	/**
	 * Credits field in *Site Settings → Footer*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.footer[].credits
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	credits: prismic.RichTextField;
}

/**
 * Content for Site Settings documents
 */
interface SettingsDocumentData {
	/**
	 * Svarit Logo field in *Site Settings*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.logo
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	logo: prismic.ImageField<never>;
	
	/**
	 * Donation Link field in *Site Settings*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: https://rzp.io/l/svarit
	 * - **API ID Path**: settings.donationLink
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	donationLink: prismic.Repeatable<prismic.LinkField<string, string, unknown, prismic.FieldState, never>>;
	
	/**
	 * Socials field in *Site Settings*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.socials[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	socials: prismic.GroupField<Simplify<SettingsDocumentDataSocialsItem>>;
	
	/**
	 * Navigation field in *Site Settings*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.nav[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	nav: prismic.GroupField<Simplify<SettingsDocumentDataNavItem>>;
	
	/**
	 * Footer field in *Site Settings*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: settings.footer[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	footer: prismic.GroupField<Simplify<SettingsDocumentDataFooterItem>>;
}

/**
 * Site Settings document from Prismic
 *
 * - **API ID**: `settings`
 * - **Repeatable**: `false`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type SettingsDocument<Lang extends string = string> = prismic.PrismicDocumentWithoutUID<Simplify<SettingsDocumentData>, "settings", Lang>;

/**
 * Content for Volunteer documents
 */
interface VolunteerDocumentData {
	/**
	 * Name field in *Volunteer*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: volunteer.name
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	name: prismic.KeyTextField;
	
	/**
	 * Photo field in *Volunteer*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: volunteer.photo
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	photo: prismic.ImageField<never>;
	
	/**
	 * Role field in *Volunteer*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: volunteer.role
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	role: prismic.KeyTextField;
}

/**
 * Volunteer document from Prismic
 *
 * - **API ID**: `volunteer`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type VolunteerDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<VolunteerDocumentData>, "volunteer", Lang>;

export type AllDocumentTypes = ArtistDocument | EventDocument | PageDocument | SettingsDocument | VolunteerDocument;

/**
 * Primary content in *About → Default → Primary*
 */
export interface AboutSliceDefaultPrimary {
	/**
	 * Heading field in *About → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: about.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *About → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: about.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
	
	/**
	 * Body field in *About → Default → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: about.default.primary.body
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	body: prismic.RichTextField;
	
	/**
	 * Stats field in *About → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: 20+ Volunteers
	 * - **API ID Path**: about.default.primary.stats
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	stats: prismic.KeyTextField;
}

/**
 * Default variation for About Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type AboutSliceDefault = prismic.SharedSliceVariation<"default", Simplify<AboutSliceDefaultPrimary>, never>;

/**
 * Slice variation for *About*
 */
type AboutSliceVariation = AboutSliceDefault

/**
 * About Shared Slice
 *
 * - **API ID**: `about`
 * - **Description**: Mission statement with the volunteer avatars pulled from Site Settings.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type AboutSlice = prismic.SharedSlice<"about", AboutSliceVariation>;

/**
 * Primary content in *ArtistList → Default → Primary*
 */
export interface ArtistListSliceDefaultPrimary {
	/**
	 * Heading field in *ArtistList → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist_list.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *ArtistList → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: artist_list.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
}

/**
 * Default variation for ArtistList Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ArtistListSliceDefault = prismic.SharedSliceVariation<"default", Simplify<ArtistListSliceDefaultPrimary>, never>;

/**
 * Slice variation for *ArtistList*
 */
type ArtistListSliceVariation = ArtistListSliceDefault

/**
 * ArtistList Shared Slice
 *
 * - **API ID**: `artist_list`
 * - **Description**: A grid of every Artist document, each card linking to its page.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ArtistListSlice = prismic.SharedSlice<"artist_list", ArtistListSliceVariation>;

/**
 * Primary content in *Contact → Default → Primary*
 */
export interface ContactSliceDefaultPrimary {
	/**
	 * Heading field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: We'd Love to Hear from You
	 * - **API ID Path**: contact.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Contact Us
	 * - **API ID Path**: contact.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
	
	/**
	 * Description field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: contact.default.primary.description
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	description: prismic.RichTextField;
	
	/**
	 * Name Label field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Name
	 * - **API ID Path**: contact.default.primary.name_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	name_label: prismic.KeyTextField;
	
	/**
	 * Email Label field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Email
	 * - **API ID Path**: contact.default.primary.email_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	email_label: prismic.KeyTextField;
	
	/**
	 * Message Label field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Message
	 * - **API ID Path**: contact.default.primary.message_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	message_label: prismic.KeyTextField;
	
	/**
	 * Submit Label field in *Contact → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Send Message
	 * - **API ID Path**: contact.default.primary.submit_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	submit_label: prismic.KeyTextField;
}

/**
 * Default variation for Contact Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ContactSliceDefault = prismic.SharedSliceVariation<"default", Simplify<ContactSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Contact*
 */
type ContactSliceVariation = ContactSliceDefault

/**
 * Contact Shared Slice
 *
 * - **API ID**: `contact`
 * - **Description**: Contact form with an introduction alongside it.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ContactSlice = prismic.SharedSlice<"contact", ContactSliceVariation>;

/**
 * Primary content in *Donate → Default → Primary*
 */
export interface DonateSliceDefaultPrimary {
	/**
	 * Heading field in *Donate → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Join us in shaping the future of Indian Music.
	 * - **API ID Path**: donate.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * CTA Label field in *Donate → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Donate to Svarit
	 * - **API ID Path**: donate.default.primary.cta_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	cta_label: prismic.KeyTextField;
	
	/**
	 * CTA Link field in *Donate → Default → Primary*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: donate.default.primary.cta_link
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	cta_link: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Background Image field in *Donate → Default → Primary*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: donate.default.primary.background_image
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	background_image: prismic.ImageField<never>;
}

/**
 * Default variation for Donate Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type DonateSliceDefault = prismic.SharedSliceVariation<"default", Simplify<DonateSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Donate*
 */
type DonateSliceVariation = DonateSliceDefault

/**
 * Donate Shared Slice
 *
 * - **API ID**: `donate`
 * - **Description**: Full width image with a donation call to action floating over it.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type DonateSlice = prismic.SharedSlice<"donate", DonateSliceVariation>;

/**
 * Primary content in *EventList → Tabs → Primary*
 */
export interface EventListSliceDefaultPrimary {
	/**
	 * Heading field in *EventList → Tabs → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event_list.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *EventList → Tabs → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Our Initiatives
	 * - **API ID Path**: event_list.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
	
	/**
	 * Limit field in *EventList → Tabs → Primary*
	 *
	 * - **Field Type**: Boolean
	 * - **Placeholder**: *None*
	 * - **Default Value**: true
	 * - **API ID Path**: event_list.default.primary.limit
	 * - **Documentation**: https://prismic.io/docs/fields/boolean
	 */
	limit: prismic.BooleanField;
}

/**
 * Tabs variation for EventList Slice
 *
 * - **API ID**: `default`
 * - **Description**: Events and Workshops tabs with load more
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type EventListSliceDefault = prismic.SharedSliceVariation<"default", Simplify<EventListSliceDefaultPrimary>, never>;

/**
 * Primary content in *EventList → Grid → Primary*
 */
export interface EventListSliceGridPrimary {
	/**
	 * Heading field in *EventList → Grid → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event_list.grid.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *EventList → Grid → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: event_list.grid.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
	
	/**
	 * Category field in *EventList → Grid → Primary*
	 *
	 * - **Field Type**: Select
	 * - **Placeholder**: *None*
	 * - **Default Value**: All
	 * - **API ID Path**: event_list.grid.primary.category
	 * - **Documentation**: https://prismic.io/docs/fields/select
	 */
	category: prismic.SelectField<"All" | "Event" | "Workshop", "filled">;
}

/**
 * Grid variation for EventList Slice
 *
 * - **API ID**: `grid`
 * - **Description**: One flat grid of event cards, filtered by category
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type EventListSliceGrid = prismic.SharedSliceVariation<"grid", Simplify<EventListSliceGridPrimary>, never>;

/**
 * Slice variation for *EventList*
 */
type EventListSliceVariation = EventListSliceDefault | EventListSliceGrid

/**
 * EventList Shared Slice
 *
 * - **API ID**: `event_list`
 * - **Description**: Lists Event documents. Tabs splits them into Events and Workshops, Grid shows one flat filtered grid.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type EventListSlice = prismic.SharedSlice<"event_list", EventListSliceVariation>;

/**
 * Item in *Hero → Default → Primary → Images*
 */
export interface HeroSliceDefaultPrimaryImagesItem {
	/**
	 * Image field in *Hero → Default → Primary → Images*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.images[].image
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	image: prismic.ImageField<never>;
}

/**
 * Primary content in *Hero → Default → Primary*
 */
export interface HeroSliceDefaultPrimary {
	/**
	 * Title field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Ushering in the Next Era of Indian Music
	 * - **API ID Path**: hero.default.primary.title
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Subtitle field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.subtitle
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	subtitle: prismic.RichTextField;
	
	/**
	 * CTA Label field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Learn more
	 * - **API ID Path**: hero.default.primary.cta_label
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	cta_label: prismic.KeyTextField;
	
	/**
	 * CTA Link field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Link
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.cta_link
	 * - **Documentation**: https://prismic.io/docs/fields/link
	 */
	cta_link: prismic.LinkField<string, string, unknown, prismic.FieldState, never>;
	
	/**
	 * Stats field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: 20+ Volunteers
	 * - **API ID Path**: hero.default.primary.stats
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	stats: prismic.KeyTextField;
	
	/**
	 * Images field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.images[]
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	images: prismic.GroupField<Simplify<HeroSliceDefaultPrimaryImagesItem>>;
	
	/**
	 * Video field in *Hero → Default → Primary*
	 *
	 * - **Field Type**: Link to Media
	 * - **Placeholder**: *None*
	 * - **API ID Path**: hero.default.primary.video
	 * - **Documentation**: https://prismic.io/docs/fields/link-to-media
	 */
	video: prismic.LinkToMediaField<prismic.FieldState, never>;
}

/**
 * Default variation for Hero Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type HeroSliceDefault = prismic.SharedSliceVariation<"default", Simplify<HeroSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Hero*
 */
type HeroSliceVariation = HeroSliceDefault

/**
 * Hero Shared Slice
 *
 * - **API ID**: `hero`
 * - **Description**: Opening section of the homepage: headline, call to action and a trio of media panels.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type HeroSlice = prismic.SharedSlice<"hero", HeroSliceVariation>;

/**
 * Item in *ImageGallery → Default → Primary → Images*
 */
export interface ImageGallerySliceDefaultPrimaryImagesItem {
	/**
	 * Image field in *ImageGallery → Default → Primary → Images*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: image_gallery.default.primary.images[].image
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	image: prismic.ImageField<never>;
	
	/**
	 * Caption field in *ImageGallery → Default → Primary → Images*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: image_gallery.default.primary.images[].caption
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	caption: prismic.KeyTextField;
}

/**
 * Primary content in *ImageGallery → Default → Primary*
 */
export interface ImageGallerySliceDefaultPrimary {
	/**
	 * Heading field in *ImageGallery → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: image_gallery.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Images field in *ImageGallery → Default → Primary*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: image_gallery.default.primary.images[]
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	images: prismic.GroupField<Simplify<ImageGallerySliceDefaultPrimaryImagesItem>>;
}

/**
 * Default variation for ImageGallery Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ImageGallerySliceDefault = prismic.SharedSliceVariation<"default", Simplify<ImageGallerySliceDefaultPrimary>, never>;

/**
 * Slice variation for *ImageGallery*
 */
type ImageGallerySliceVariation = ImageGallerySliceDefault

/**
 * ImageGallery Shared Slice
 *
 * - **API ID**: `image_gallery`
 * - **Description**: A grid of captioned images for event and artist pages.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ImageGallerySlice = prismic.SharedSlice<"image_gallery", ImageGallerySliceVariation>;

/**
 * Primary content in *Quote → Default → Primary*
 */
export interface QuoteSliceDefaultPrimary {
	/**
	 * Quote field in *Quote → Default → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: quote.default.primary.quote
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	quote: prismic.RichTextField;
	
	/**
	 * Attribution field in *Quote → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: quote.default.primary.attribution
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	attribution: prismic.KeyTextField;
}

/**
 * Default variation for Quote Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type QuoteSliceDefault = prismic.SharedSliceVariation<"default", Simplify<QuoteSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Quote*
 */
type QuoteSliceVariation = QuoteSliceDefault

/**
 * Quote Shared Slice
 *
 * - **API ID**: `quote`
 * - **Description**: A pulled quote with an attribution.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type QuoteSlice = prismic.SharedSlice<"quote", QuoteSliceVariation>;

/**
 * Primary content in *RichText → Default → Primary*
 */
export interface RichTextSliceDefaultPrimary {
	/**
	 * Content field in *RichText → Default → Primary*
	 *
	 * - **Field Type**: Rich Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: rich_text.default.primary.content
	 * - **Documentation**: https://prismic.io/docs/fields/rich-text
	 */
	content: prismic.RichTextField;
}

/**
 * Default variation for RichText Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type RichTextSliceDefault = prismic.SharedSliceVariation<"default", Simplify<RichTextSliceDefaultPrimary>, never>;

/**
 * Slice variation for *RichText*
 */
type RichTextSliceVariation = RichTextSliceDefault

/**
 * RichText Shared Slice
 *
 * - **API ID**: `rich_text`
 * - **Description**: A block of formatted copy for event and artist pages.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type RichTextSlice = prismic.SharedSlice<"rich_text", RichTextSliceVariation>;

/**
 * Item in *Sponsors → Default → Primary → Logos*
 */
export interface SponsorsSliceDefaultPrimaryLogosItem {
	/**
	 * Logo field in *Sponsors → Default → Primary → Logos*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: sponsors.default.primary.logos[].logo
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	logo: prismic.ImageField<never>;
	
	/**
	 * Name field in *Sponsors → Default → Primary → Logos*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: sponsors.default.primary.logos[].name
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	name: prismic.KeyTextField;
}

/**
 * Primary content in *Sponsors → Default → Primary*
 */
export interface SponsorsSliceDefaultPrimary {
	/**
	 * Heading field in *Sponsors → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: The Champions of Our Mission So Far
	 * - **API ID Path**: sponsors.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *Sponsors → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: Previous Sponsors
	 * - **API ID Path**: sponsors.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
	
	/**
	 * Logos field in *Sponsors → Default → Primary*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: sponsors.default.primary.logos[]
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	logos: prismic.GroupField<Simplify<SponsorsSliceDefaultPrimaryLogosItem>>;
}

/**
 * Default variation for Sponsors Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type SponsorsSliceDefault = prismic.SharedSliceVariation<"default", Simplify<SponsorsSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Sponsors*
 */
type SponsorsSliceVariation = SponsorsSliceDefault

/**
 * Sponsors Shared Slice
 *
 * - **API ID**: `sponsors`
 * - **Description**: Auto scrolling marquee of sponsor logos.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type SponsorsSlice = prismic.SharedSlice<"sponsors", SponsorsSliceVariation>;

/**
 * Primary content in *Volunteers → Default → Primary*
 */
export interface VolunteersSliceDefaultPrimary {
	/**
	 * Heading field in *Volunteers → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: volunteers.default.primary.heading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	heading: prismic.KeyTextField;
	
	/**
	 * Subheading field in *Volunteers → Default → Primary*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: volunteers.default.primary.subheading
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	subheading: prismic.KeyTextField;
}

/**
 * Default variation for Volunteers Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type VolunteersSliceDefault = prismic.SharedSliceVariation<"default", Simplify<VolunteersSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Volunteers*
 */
type VolunteersSliceVariation = VolunteersSliceDefault

/**
 * Volunteers Shared Slice
 *
 * - **API ID**: `volunteers`
 * - **Description**: A full grid of every Volunteer document.
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type VolunteersSlice = prismic.SharedSlice<"volunteers", VolunteersSliceVariation>;

declare module "@prismicio/client" {
	interface CreateClient {
		(repositoryNameOrEndpoint: string, options?: prismic.ClientConfig): prismic.Client<AllDocumentTypes>;
	}
	
	interface CreateWriteClient {
		(repositoryNameOrEndpoint: string, options: prismic.WriteClientConfig): prismic.WriteClient<AllDocumentTypes>;
	}
	
	interface CreateMigration {
		(): prismic.Migration<AllDocumentTypes>;
	}
	
	namespace Content {
		export type {
			ArtistDocument,
			ArtistDocumentData,
			ArtistDocumentDataLinksItem,
			ArtistDocumentDataSlicesSlice,
			EventDocument,
			EventDocumentData,
			EventDocumentDataArtistsItem,
			EventDocumentDataSlicesSlice,
			PageDocument,
			PageDocumentData,
			PageDocumentDataSlicesSlice,
			SettingsDocument,
			SettingsDocumentData,
			SettingsDocumentDataSocialsItem,
			SettingsDocumentDataNavItem,
			SettingsDocumentDataFooterItem,
			VolunteerDocument,
			VolunteerDocumentData,
			AllDocumentTypes,
			AboutSlice,
			AboutSliceDefaultPrimary,
			AboutSliceVariation,
			AboutSliceDefault,
			ArtistListSlice,
			ArtistListSliceDefaultPrimary,
			ArtistListSliceVariation,
			ArtistListSliceDefault,
			ContactSlice,
			ContactSliceDefaultPrimary,
			ContactSliceVariation,
			ContactSliceDefault,
			DonateSlice,
			DonateSliceDefaultPrimary,
			DonateSliceVariation,
			DonateSliceDefault,
			EventListSlice,
			EventListSliceDefaultPrimary,
			EventListSliceGridPrimary,
			EventListSliceVariation,
			EventListSliceDefault,
			EventListSliceGrid,
			HeroSlice,
			HeroSliceDefaultPrimaryImagesItem,
			HeroSliceDefaultPrimary,
			HeroSliceVariation,
			HeroSliceDefault,
			ImageGallerySlice,
			ImageGallerySliceDefaultPrimaryImagesItem,
			ImageGallerySliceDefaultPrimary,
			ImageGallerySliceVariation,
			ImageGallerySliceDefault,
			QuoteSlice,
			QuoteSliceDefaultPrimary,
			QuoteSliceVariation,
			QuoteSliceDefault,
			RichTextSlice,
			RichTextSliceDefaultPrimary,
			RichTextSliceVariation,
			RichTextSliceDefault,
			SponsorsSlice,
			SponsorsSliceDefaultPrimaryLogosItem,
			SponsorsSliceDefaultPrimary,
			SponsorsSliceVariation,
			SponsorsSliceDefault,
			VolunteersSlice,
			VolunteersSliceDefaultPrimary,
			VolunteersSliceVariation,
			VolunteersSliceDefault
		}
	}
}